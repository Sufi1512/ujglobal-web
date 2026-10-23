"""Background jobs run by the ARQ worker (`arq app.workers.main.WorkerSettings`)."""

import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, cast

import httpx
from arq import Retry
from sqlalchemy import delete, or_, select
from sqlalchemy.engine import CursorResult

from app.core import audit, ratelimit
from app.core.config import get_settings
from app.core.db import SessionLocal
from app.models import AuthSession, Lead, LeadNote, LeadStatus, User, UserRole
from app.services.email import build_lead_alert, build_security_alert, send_email
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

        # A flood of fake enquiries must not become a flood of emails (or burn the provider's quota).
        # Past the hourly cap the lead stays in the inbox, just without its own email.
        cap = await ratelimit.hit("alert-emails", "all", settings.alert_emails_max_per_hour, 3600)
        if not cap.allowed:
            lead.notified_at = datetime.now(UTC)
            log.warning("Hourly alert cap reached; lead %s is in the inbox without an email", lead_id)
            return "capped"

        try:
            await send_email(build_lead_alert(lead, settings), settings)
        except Exception as exc:
            attempt = ctx.get("job_try", 1)
            log.warning("Alert email for lead %s failed (attempt %s): %s", lead_id, attempt, exc)
            raise Retry(defer=RETRY_DELAYS[min(attempt, len(RETRY_DELAYS)) - 1]) from exc

        lead.notified_at = datetime.now(UTC)
    log.info("Sent new-lead alert for %s", lead_id)
    return "sent"


async def send_security_alert(ctx: dict[str, Any], kind: str, details: dict[str, str]) -> str:
    """Emails every active owner about a security event (falls back to LEAD_ALERT_RECIPIENTS)."""
    settings = get_settings()
    async with SessionLocal() as session:
        owners = list(
            await session.scalars(
                select(User.email).where(User.role == UserRole.owner, User.is_active.is_(True))
            )
        )
    recipients = owners or settings.lead_alert_recipients
    if not recipients:
        log.warning("No owner to email about security event %s", kind)
        return "no recipients"
    await send_email(build_security_alert(kind, details, recipients, settings), settings)
    log.info("Sent security alert %s to %s owner(s)", kind, len(recipients))
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


async def purge_expired_data(ctx: dict[str, Any]) -> dict[str, int]:
    """Daily: deletes leads past the retention period (privacy policy) and long-dead admin sessions.

    A lead's last activity is the later of its own last change (status, assignee) and its newest note.
    Won leads are clients, kept under the client relationship instead.
    """
    settings = get_settings()
    now = datetime.now(UTC)
    deleted_leads = 0
    async with SessionLocal() as session, session.begin():
        if settings.lead_retention_days > 0:
            cutoff = now - timedelta(days=settings.lead_retention_days)
            recent_note = select(LeadNote.id).where(
                LeadNote.lead_id == Lead.id, LeadNote.created_at >= cutoff
            )
            expired = list(
                await session.scalars(
                    select(Lead).where(
                        Lead.updated_at < cutoff,
                        Lead.status != LeadStatus.won,
                        ~recent_note.exists(),
                    )
                )
            )
            for lead in expired:
                # No personal data in the audit trail: only that a lead of this kind was removed.
                audit.record(
                    session,
                    None,
                    "delete",
                    "lead",
                    lead.id,
                    {"reason": "retention", "status": lead.status, "created_at": lead.created_at},
                )
                await session.delete(lead)
            deleted_leads = len(expired)

        # Sign-in sessions that ended (expired or revoked) more than 30 days ago serve no purpose.
        sessions = cast(
            CursorResult[Any],
            await session.execute(
                delete(AuthSession).where(
                    or_(
                        AuthSession.expires_at < now - timedelta(days=30),
                        AuthSession.revoked_at < now - timedelta(days=30),
                    )
                )
            ),
        )
    if deleted_leads:
        log.info(
            "Retention: deleted %s lead(s) with no activity for %s days",
            deleted_leads,
            settings.lead_retention_days,
        )
    return {"leads": deleted_leads, "sessions": sessions.rowcount or 0}
