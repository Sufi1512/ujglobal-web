"""Abuse protections from the security review: sign-in limits, two-factor sign-in, contact form limits."""

import time

import pyotp
import pytest
from sqlalchemy import select

from app.core import mfa, ratelimit, turnstile
from app.core.client import client_ip
from app.core.config import get_settings
from app.core.security import hash_password
from app.models import Lead, LeadSource, User, UserRole
from app.routers import auth as auth_router
from app.routers.auth import REFRESH_COOKIE

PASSWORD = "correct horse battery staple"
CONTACT = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "message": "We need a new website soon.",
    "consent": True,
}


@pytest.fixture
async def make_user(session_factory):
    async def make(email="owner@ujglobal.tech", role=UserRole.owner) -> User:
        async with session_factory() as session:
            user = User(
                email=email, name=email.split("@")[0], role=role, password_hash=hash_password(PASSWORD)
            )
            session.add(user)
            await session.commit()
            return user

    return make


@pytest.fixture
def alerts(monkeypatch):
    sent: list[tuple[str, dict]] = []

    async def fake(kind, details):
        sent.append((kind, details))
        return True

    monkeypatch.setattr(auth_router, "queue_security_alert", fake)
    return sent


def login(client, email="owner@ujglobal.tech", password=PASSWORD, ip="198.51.100.1"):
    return client.post(
        "/v1/auth/login", json={"email": email, "password": password}, headers={"x-real-ip": ip}
    )


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


# --- Sign-in limits -----------------------------------------------------------------------------------


async def test_account_locks_after_repeated_wrong_passwords(client, make_user, alerts, monkeypatch):
    monkeypatch.setattr(get_settings(), "login_max_failures_per_account", 3)
    await make_user()
    for i in range(3):
        assert (await login(client, password=f"wrong {i}", ip=f"198.51.100.{i}")).status_code == 401

    blocked = await login(client, ip="198.51.100.99")  # even the right password, from a new address
    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) > 0
    assert "try again" in blocked.json()["detail"]
    # The owners hear about it once, with no password in the message.
    assert [kind for kind, _ in alerts] == ["signin_locked"]
    assert alerts[0][1]["account"] == "owner@ujglobal.tech"


async def test_lock_is_per_account(client, make_user, alerts, monkeypatch):
    monkeypatch.setattr(get_settings(), "login_max_failures_per_account", 2)
    await make_user()
    await make_user("sales@ujglobal.tech", UserRole.sales)
    for i in range(2):
        await login(client, password="nope", ip=f"203.0.113.{i}")
    assert (await login(client, ip="203.0.113.50")).status_code == 429
    assert (await login(client, email="sales@ujglobal.tech", ip="203.0.113.51")).status_code == 200


async def test_success_clears_the_failure_count(client, make_user, alerts, monkeypatch):
    monkeypatch.setattr(get_settings(), "login_max_failures_per_account", 3)
    await make_user()
    await login(client, password="nope")
    await login(client, password="nope")
    assert (await login(client)).status_code == 200
    await login(client, password="nope")
    await login(client, password="nope")
    assert (await login(client)).status_code == 200


async def test_one_address_guessing_many_accounts_is_blocked(client, make_user, alerts, monkeypatch):
    monkeypatch.setattr(get_settings(), "login_max_failures_per_ip", 4)
    await make_user()
    for i in range(4):
        await login(client, email=f"guess{i}@ujglobal.tech", password="nope", ip="192.0.2.66")
    assert (await login(client, ip="192.0.2.66")).status_code == 429
    assert (await login(client, ip="192.0.2.67")).status_code == 200


def test_visitor_supplied_ip_headers_are_ignored():
    class FakeRequest:
        headers = {"cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8"}

        class client:  # noqa: N801
            host = "10.0.0.5"

    assert client_ip(FakeRequest()) == "10.0.0.5"
    FakeRequest.headers = {"x-real-ip": "203.0.113.9", "cf-connecting-ip": "1.2.3.4"}
    assert client_ip(FakeRequest()) == "203.0.113.9"


# --- Two-factor sign-in -------------------------------------------------------------------------------


async def enable_mfa(client, token) -> tuple[str, list[str]]:
    setup = await client.post("/v1/auth/mfa/setup", headers=bearer(token))
    assert setup.status_code == 200
    body = setup.json()
    assert body["otpauth_uri"].startswith("otpauth://totp/") and body["qr_data_uri"].startswith(
        "data:image/svg+xml"
    )
    secret = body["secret"]
    # Codes for the next time step, so the sign-in below can use the current one.
    enabled = await client.post(
        "/v1/auth/mfa/enable", json={"code": pyotp.TOTP(secret).at(time.time() - 30)}, headers=bearer(token)
    )
    assert enabled.status_code == 200
    codes = enabled.json()["backup_codes"]
    assert len(codes) == 10
    return secret, codes


async def test_required_role_must_set_up_two_factor_first(client, make_user, monkeypatch):
    monkeypatch.setattr(get_settings(), "mfa_required_roles", ["owner", "sales"])
    await make_user()
    res = await login(client)
    token = res.json()["access_token"]
    assert res.json()["user"]["mfa_required"] is True and res.json()["user"]["mfa_enabled"] is False

    blocked = await client.get("/v1/admin/leads", headers=bearer(token))
    assert blocked.status_code == 403 and "Two-factor" in blocked.json()["detail"]

    await enable_mfa(client, token)
    assert (await client.get("/v1/admin/leads", headers=bearer(token))).status_code == 200


async def test_sign_in_needs_the_code_once_two_factor_is_on(client, make_user, session_factory):
    user = await make_user()
    secret, _ = await enable_mfa(client, (await login(client)).json()["access_token"])

    async with session_factory() as session:
        stored = await session.get(User, user.id)
    assert secret not in (stored.totp_secret_enc or "")  # encrypted at rest

    challenge = await login(client)
    assert challenge.status_code == 200
    assert challenge.json()["mfa_required"] is True and "access_token" not in challenge.json()
    assert REFRESH_COOKIE not in challenge.headers.get("set-cookie", "")
    mfa_token = challenge.json()["mfa_token"]

    # The challenge token is not an access token.
    assert (await client.get("/v1/auth/me", headers=bearer(mfa_token))).status_code == 401
    assert (
        await client.post("/v1/auth/mfa/verify", json={"mfa_token": mfa_token, "code": "000000"})
    ).status_code == 401

    code = pyotp.TOTP(secret).now()
    ok = await client.post("/v1/auth/mfa/verify", json={"mfa_token": mfa_token, "code": code})
    assert ok.status_code == 200 and ok.json()["access_token"]
    assert REFRESH_COOKIE in ok.headers["set-cookie"]

    # The same code can't be used twice.
    again = await login(client)
    replay = await client.post(
        "/v1/auth/mfa/verify", json={"mfa_token": again.json()["mfa_token"], "code": code}
    )
    assert replay.status_code == 401


async def test_backup_codes_work_once(client, make_user):
    await make_user()
    _, codes = await enable_mfa(client, (await login(client)).json()["access_token"])
    first = (await login(client)).json()["mfa_token"]
    assert (
        await client.post("/v1/auth/mfa/verify", json={"mfa_token": first, "code": codes[0].upper()})
    ).status_code == 200
    second = (await login(client)).json()["mfa_token"]
    assert (
        await client.post("/v1/auth/mfa/verify", json={"mfa_token": second, "code": codes[0]})
    ).status_code == 401


async def test_guessing_two_factor_codes_is_limited(client, make_user, alerts):
    await make_user()
    secret, _ = await enable_mfa(client, (await login(client)).json()["access_token"])
    mfa_token = (await login(client)).json()["mfa_token"]
    for _ in range(auth_router.MFA_MAX_FAILURES):
        await client.post("/v1/auth/mfa/verify", json={"mfa_token": mfa_token, "code": "123456"})
    blocked = await client.post(
        "/v1/auth/mfa/verify", json={"mfa_token": mfa_token, "code": pyotp.TOTP(secret).now()}
    )
    assert blocked.status_code == 429
    assert alerts and alerts[-1][1]["what"] == "two-factor code"


def test_totp_rejects_old_and_reused_steps():
    secret = pyotp.random_base32()
    now = 1_800_000_000
    step = mfa.verify_totp(secret, pyotp.TOTP(secret).at(now), None, now=now)
    assert step == now // 30
    assert mfa.verify_totp(secret, pyotp.TOTP(secret).at(now), step, now=now) is None
    assert mfa.verify_totp(secret, pyotp.TOTP(secret).at(now - 120), None, now=now) is None


# --- Contact form -------------------------------------------------------------------------------------


async def test_contact_form_is_limited_per_address(client, monkeypatch, session_factory):
    monkeypatch.setattr(get_settings(), "contact_max_per_ip", 3)
    for _ in range(3):
        assert (
            await client.post("/v1/leads/contact", json=CONTACT, headers={"x-real-ip": "198.51.100.7"})
        ).status_code == 201
    flood = await client.post("/v1/leads/contact", json=CONTACT, headers={"x-real-ip": "198.51.100.7"})
    assert flood.status_code == 429 and int(flood.headers["Retry-After"]) > 0
    assert (
        await client.post("/v1/leads/contact", json=CONTACT, headers={"x-real-ip": "198.51.100.8"})
    ).status_code == 201
    async with session_factory() as session:
        assert len(list(await session.scalars(select(Lead)))) == 4


async def test_turnstile_is_checked_when_configured(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "turnstile_secret", "test-secret")
    seen = []

    class FakeClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, url, data):
            seen.append(data)

            class R:
                def json(self):
                    return {"success": data["response"] == "good-token"}

            return R()

    monkeypatch.setattr(turnstile.httpx, "AsyncClient", FakeClient)
    assert (await client.post("/v1/leads/contact", json=CONTACT)).status_code == 400
    assert (
        await client.post("/v1/leads/contact", json={**CONTACT, "turnstile_token": "bad"})
    ).status_code == 400
    assert (
        await client.post("/v1/leads/contact", json={**CONTACT, "turnstile_token": "good-token"})
    ).status_code == 201
    assert seen[-1]["secret"] == "test-secret"


async def test_turnstile_off_by_default():
    assert await turnstile.verify(None, None) is True


async def test_alert_emails_are_capped_per_hour(monkeypatch, session_factory):
    from app.workers import tasks

    sent = []

    async def fake_send(message, settings):
        sent.append(message)

    monkeypatch.setattr(tasks, "send_email", fake_send)
    monkeypatch.setattr(get_settings(), "alert_emails_max_per_hour", 2)
    monkeypatch.setattr(get_settings(), "lead_alert_recipients", ["team@ujglobal.tech"])
    async with session_factory() as session:
        leads = [
            Lead(
                name=f"L{i}",
                email=f"l{i}@example.com",
                message="hello there friend",
                consent=True,
                source=LeadSource.contact,
            )
            for i in range(3)
        ]
        session.add_all(leads)
        await session.commit()
    results = [await tasks.send_lead_alert({"job_try": 1}, str(lead.id)) for lead in leads]
    assert results == ["sent", "sent", "capped"] and len(sent) == 2


# --- Redis backend ------------------------------------------------------------------------------------


async def test_redis_backend_counts_and_expires():
    import os

    url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    backend = ratelimit.RedisBackend(url)
    try:
        await backend.reset("rl:test:x")
    except Exception:
        if os.environ.get("CI") == "true":
            raise
        pytest.skip("Redis not running")
    ratelimit.use_backend(backend)
    try:
        assert (await ratelimit.hit("test", "x", 2, 60)).allowed
        assert (await ratelimit.hit("test", "x", 2, 60)).allowed
        third = await ratelimit.hit("test", "x", 2, 60)
        assert not third.allowed and 0 < third.retry_after <= 60
        assert not (await ratelimit.check("test", "x", 2)).allowed
        await ratelimit.reset("test", "x")
        assert (await ratelimit.check("test", "x", 2)).allowed
    finally:
        await backend.reset(ratelimit._key("test", "x"))
        await backend.close()


async def test_limiter_outage_does_not_block_sign_in(client, make_user, monkeypatch):
    ratelimit.use_backend(ratelimit.RedisBackend("redis://127.0.0.1:1/0"))
    await make_user()
    assert (await login(client)).status_code == 200


async def test_reset_mfa_command_clears_two_factor(client, make_user, session_factory):
    from app.cli import reset_mfa

    user = await make_user()
    await enable_mfa(client, (await login(client)).json()["access_token"])
    await reset_mfa("owner@ujglobal.tech")
    async with session_factory() as session:
        stored = await session.get(User, user.id)
    assert stored.totp_enabled_at is None and stored.totp_secret_enc is None
    assert stored.backup_code_hashes == []
    assert "access_token" in (await login(client)).json()
