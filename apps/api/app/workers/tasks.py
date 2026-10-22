"""Background jobs run by the ARQ worker (`arq app.workers.main.WorkerSettings`)."""

import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from arq import Retry
from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.models import Lead
from app.services.email import build_lead_alert, send_email
from app.workers.queue import SEND_LEAD_ALERT, lead_alert_job_id

log = logging.getLogger(__name__)

# Back-off between attempts at sending one alert: 1, 2, 5, 10, 30 minutes.
RETRY_DELAYS = [60, 120, 300, 600, 1800]
# The sweep leaves brand-new leads alone (their own job is probably running) and gives up after a week.
SWEEP_MIN_AGE = timedelta(minutes=2)
SWEEP_MAX_AGE = timedelta(days=7)
SWEEP_BATCH = 100


async def send_lead_alert(ctx: dict[str, Any], lead_id: str) -> str:
    settings = get_settings()
    if not settings.lead_alert_recipients:
        log.warning("LEAD_ALERT_RECIPIENTS is empty; not emailing lead %s", lead_id)
        return "disabled"

    async with SessionLocal() as session, session.begin():
        # The row lock stops two workers emailing the same lead; a locked row means another worker has it.
        lead = await session.scalar(
            select(Lead).where(Lead.id == uuid.UUID(lead_id)).with_for_update(skip_locked=True)
        )
        if lead is None:
            return "skipped"
        if lead.notified_at is not None:
            return "already sent"

        try:
            await send_email(build_lead_alert(lead, settings), settings)
        except Exception as exc:
            attempt = ctx.get("job_try", 1)
            log.warning("Alert email for lead %s failed (attempt %s): %s", lead_id, attempt, exc)
            raise Retry(defer=RETRY_DELAYS[min(attempt, len(RETRY_DELAYS)) - 1]) from exc

        lead.notified_at = datetime.now(UTC)
    log.info("Sent new-lead alert for %s", lead_id)
    return "sent"


async def sweep_unsent_lead_alerts(ctx: dict[str, Any]) -> int:
    """Queues alerts that never went out, for example because Redis or SMTP was down. Runs every minute."""
    if not get_settings().lead_alert_recipients:
        return 0
    now = datetime.now(UTC)
    async with SessionLocal() as session:
        lead_ids = list(
            await session.scalars(
                select(Lead.id)
                .where(
                    Lead.notified_at.is_(None),
                    Lead.created_at < now - SWEEP_MIN_AGE,
                    Lead.created_at > now - SWEEP_MAX_AGE,
                )
                .order_by(Lead.created_at)
                .limit(SWEEP_BATCH)
            )
        )
    queued = 0
    for lead_id in lead_ids:
        # enqueue_job returns None when this lead's job is already queued or running.
        if await ctx["redis"].enqueue_job(SEND_LEAD_ALERT, str(lead_id), _job_id=lead_alert_job_id(lead_id)):
            queued += 1
    if queued:
        log.info("Sweep re-queued %s lead alert(s)", queued)
    return queued


# Content tags the website knows how to refresh (see apps/web/src/app/api/revalidate/route.ts).
CONTENT_TAGS = {"services", "case-studies"}


async def revalidate_web(ctx: dict[str, Any], tags: list[str]) -> str:
    """Tells the Next.js site to drop its cached copies of pages that show this content."""
    settings = get_settings()
    if not settings.web_revalidate_url:
        return "disabled"
    wanted = sorted(set(tags) & CONTENT_TAGS)
    if not wanted:
        return "nothing to do"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                settings.web_revalidate_url,
                json={"tags": wanted},
                headers={"X-Revalidate-Secret": settings.revalidate_secret},
            )
            res.raise_for_status()
    except httpx.HTTPError as exc:
        attempt = ctx.get("job_try", 1)
        log.warning("Website refresh for %s failed (attempt %s): %s", wanted, attempt, exc)
        raise Retry(defer=RETRY_DELAYS[min(attempt, len(RETRY_DELAYS)) - 1]) from exc
    return "refreshed " + ", ".join(wanted)
