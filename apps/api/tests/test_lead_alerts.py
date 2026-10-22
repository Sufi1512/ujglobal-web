import asyncio
import email
import os
import socket
import uuid
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage
from email.policy import default as default_policy

import pytest
from aiosmtpd.controller import Controller
from arq import Retry
from sqlalchemy import select

from app.core.config import get_settings
from app.models import Lead, LeadSource
from app.services.email import build_lead_alert, send_email
from app.workers import tasks
from app.workers.tasks import send_lead_alert, sweep_unsent_lead_alerts

VALID = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "company": "Analytical Engines",
    "message": "We need an AI assistant for our support team.",
}


def make_lead(**overrides) -> Lead:
    values = {
        "id": uuid.uuid4(),
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "company": "Analytical Engines",
        "message": "Line one\nLine two <script>alert(1)</script>",
        "source": LeadSource.contact,
        "landing_page": "/services/ai-integration",
        "utm": {"utm_source": "google"},
        "consent": True,
        "services": [],
        "created_at": datetime(2026, 10, 22, 19, 1, tzinfo=UTC),
    }
    values.update(overrides)
    return Lead(**values)


@pytest.fixture
def settings(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "lead_alert_recipients", ["team@ujglobal.tech", "sales@ujglobal.tech"])
    monkeypatch.setattr(s, "admin_base_url", "https://ujglobal.tech/")
    return s


@pytest.fixture
def sent(monkeypatch) -> list[EmailMessage]:
    """Captures emails the worker sends instead of using SMTP."""
    outbox: list[EmailMessage] = []

    async def fake_send(msg, settings=None):
        outbox.append(msg)

    monkeypatch.setattr(tasks, "send_email", fake_send)
    return outbox


async def save(session_factory, *leads: Lead) -> None:
    async with session_factory() as session:
        session.add_all(leads)
        await session.commit()


async def notified_at(session_factory, lead_id):
    async with session_factory() as session:
        return await session.scalar(select(Lead.notified_at).where(Lead.id == lead_id))


# --- The email itself -------------------------------------------------------------------------------


def test_alert_email_content(settings):
    lead = make_lead()
    msg = build_lead_alert(lead, settings)

    assert msg["Subject"] == "New lead: Ada Lovelace (Analytical Engines) via contact form"
    assert msg["To"] == "team@ujglobal.tech, sales@ujglobal.tech"
    assert msg["Reply-To"] == "Ada Lovelace <ada@example.com>"
    assert msg["Auto-Submitted"] == "auto-generated"

    text = msg.get_body(("plain",)).get_content()
    link = f"https://ujglobal.tech/admin/leads/{lead.id}"
    assert link in text
    assert "Line one\nLine two" in text
    assert "Campaign: utm_source: google" in text
    assert "Received: 22 Oct 2026, 19:01 UTC" in text

    page = msg.get_body(("html",)).get_content()
    assert "<script>" not in page
    assert "&lt;script&gt;" in page
    assert f'href="{link}"' in page


def test_alert_subject_cannot_be_used_for_header_injection(settings):
    lead = make_lead(name="Eve\r\nBcc: victim@example.com", company=None)
    msg = build_lead_alert(lead, settings)
    assert msg["Subject"] == "New lead: Eve Bcc: victim@example.com via contact form"
    assert msg["Bcc"] is None
    assert "\n" not in str(msg["Reply-To"])


async def test_send_email_over_real_smtp(settings, monkeypatch):
    """Round trip through a local SMTP server, the same path Mailpit, Resend and Postmark use."""
    received: list[bytes] = []

    class Handler:
        async def handle_DATA(self, server, session, envelope):
            received.append(envelope.content)
            return "250 OK"

    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    controller = Controller(Handler(), hostname="127.0.0.1", port=port)
    controller.start()
    try:
        monkeypatch.setattr(settings, "smtp_host", "127.0.0.1")
        monkeypatch.setattr(settings, "smtp_port", port)
        monkeypatch.setattr(settings, "smtp_security", "none")
        await send_email(build_lead_alert(make_lead(), settings), settings)
    finally:
        controller.stop()

    [raw] = received
    parsed = email.message_from_bytes(raw, policy=default_policy)
    assert parsed["Subject"].startswith("New lead: Ada Lovelace")


# --- The contact endpoint queues an alert ---------------------------------------------------------


async def test_contact_form_queues_an_alert_after_saving(client, queued_alerts, session_factory):
    res = await client.post("/v1/leads/contact", json=VALID)
    assert res.status_code == 201
    assert [str(i) for i in queued_alerts] == [res.json()["id"]]
    assert await notified_at(session_factory, uuid.UUID(res.json()["id"])) is None


async def test_honeypot_submissions_are_not_alerted(client, queued_alerts):
    await client.post("/v1/leads/contact", json={**VALID, "website": "spam.example"})
    assert queued_alerts == []


async def test_lead_is_saved_even_when_redis_is_down(client, monkeypatch, session_factory):
    from app.workers import queue

    monkeypatch.setattr(queue, "_pool", None)
    monkeypatch.setattr(get_settings(), "redis_url", "redis://127.0.0.1:1/0")
    monkeypatch.setattr("app.routers.leads.queue_lead_alert", queue.queue_lead_alert)

    res = await client.post("/v1/leads/contact", json=VALID)
    assert res.status_code == 201
    async with session_factory() as session:
        assert await session.scalar(select(Lead.id)) == uuid.UUID(res.json()["id"])


# --- The worker job ---------------------------------------------------------------------------------


async def test_worker_sends_once_and_records_it(settings, sent, session_factory):
    lead = make_lead()
    await save(session_factory, lead)

    assert await send_lead_alert({"job_try": 1}, str(lead.id)) == "sent"
    assert len(sent) == 1
    assert await notified_at(session_factory, lead.id) is not None

    # A duplicate job (say from the sweep) doesn't send a second email.
    assert await send_lead_alert({"job_try": 1}, str(lead.id)) == "already sent"
    assert len(sent) == 1


async def test_worker_retries_with_backoff_when_smtp_fails(settings, monkeypatch, session_factory):
    lead = make_lead()
    await save(session_factory, lead)

    async def broken(msg, settings=None):
        raise ConnectionRefusedError("smtp down")

    monkeypatch.setattr(tasks, "send_email", broken)
    with pytest.raises(Retry) as exc:
        await send_lead_alert({"job_try": 3}, str(lead.id))
    assert exc.value.defer_score == 300 * 1000
    assert await notified_at(session_factory, lead.id) is None


async def test_worker_does_nothing_without_recipients(settings, sent, monkeypatch, session_factory):
    lead = make_lead()
    await save(session_factory, lead)
    monkeypatch.setattr(settings, "lead_alert_recipients", [])

    assert await send_lead_alert({"job_try": 1}, str(lead.id)) == "disabled"
    assert sent == []
    assert await sweep_unsent_lead_alerts({"redis": None}) == 0


async def test_worker_skips_deleted_leads(settings, sent):
    assert await send_lead_alert({"job_try": 1}, str(uuid.uuid4())) == "skipped"
    assert sent == []


async def test_sweep_requeues_only_unsent_recent_leads(settings, session_factory):
    now = datetime.now(UTC)
    missed = make_lead(created_at=now - timedelta(minutes=10))
    just_arrived = make_lead(created_at=now - timedelta(seconds=30))
    already_sent = make_lead(created_at=now - timedelta(hours=1), notified_at=now - timedelta(hours=1))
    too_old = make_lead(created_at=now - timedelta(days=8))
    await save(session_factory, missed, just_arrived, already_sent, too_old)

    class FakeRedis:
        def __init__(self):
            self.jobs: list[tuple[str, str, str]] = []

        async def enqueue_job(self, name, lead_id, _job_id):
            self.jobs.append((name, lead_id, _job_id))
            return object()

    redis = FakeRedis()
    assert await sweep_unsent_lead_alerts({"redis": redis}) == 1
    assert redis.jobs == [("send_lead_alert", str(missed.id), f"lead-alert:{missed.id}")]


# --- Full path through real Redis and the real worker ------------------------------------------------


def _redis_available() -> bool:
    url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    host_port = url.split("//", 1)[1].split("/", 1)[0]
    host, _, port = host_port.partition(":")
    try:
        with socket.create_connection((host, int(port or 6379)), timeout=0.5):
            return True
    except OSError:
        return False


# Skipped locally without Redis, but never in CI: there a missing Redis must fail the build.
@pytest.mark.skipif(
    not _redis_available() and not os.environ.get("CI"), reason="needs Redis (CI provides one)"
)
async def test_contact_form_to_inbox_through_redis_and_worker(
    client, settings, sent, monkeypatch, session_factory
):
    from arq.worker import Worker

    from app.workers import queue
    from app.workers.main import WorkerSettings

    monkeypatch.setattr(settings, "redis_url", os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
    monkeypatch.setattr(queue, "_pool", None)
    monkeypatch.setattr("app.routers.leads.queue_lead_alert", queue.queue_lead_alert)

    res = await client.post("/v1/leads/contact", json=VALID)
    lead_id = uuid.UUID(res.json()["id"])

    worker = Worker(
        functions=WorkerSettings.functions,
        redis_settings=queue.redis_settings(),
        burst=True,
        poll_delay=0.05,
        keep_result=0,
        max_tries=WorkerSettings.max_tries,
        handle_signals=False,
    )
    try:
        await asyncio.wait_for(worker.main(), timeout=20)
    finally:
        await worker.close()
        await queue.close_queue()

    assert [m["Subject"] for m in sent] == ["New lead: Ada Lovelace (Analytical Engines) via contact form"]
    assert await notified_at(session_factory, lead_id) is not None
