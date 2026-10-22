"""Putting jobs on the Redis queue from the API.

Queueing is best effort: the lead is already saved before anything here runs, and the worker's sweep
picks up any lead whose alert never went out, so a Redis outage delays an alert but never loses a lead.
"""

import logging
import uuid

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from app.core.config import get_settings

log = logging.getLogger(__name__)

SEND_LEAD_ALERT = "send_lead_alert"

_pool: ArqRedis | None = None


def redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(get_settings().redis_url)


def lead_alert_job_id(lead_id: uuid.UUID) -> str:
    # A fixed job id per lead means a lead is never queued twice at the same time.
    return f"lead-alert:{lead_id}"


async def _get_pool() -> ArqRedis:
    global _pool
    if _pool is None:
        settings = redis_settings()
        # No connection retries on the request path: fail fast and let the sweep catch up.
        settings.conn_retries = 0
        settings.conn_timeout = 2
        _pool = await create_pool(settings)
    return _pool


async def queue_lead_alert(lead_id: uuid.UUID) -> bool:
    """Returns True if the alert job was queued. Never raises."""
    try:
        pool = await _get_pool()
        await pool.enqueue_job(SEND_LEAD_ALERT, str(lead_id), _job_id=lead_alert_job_id(lead_id))
        return True
    except Exception:
        log.exception("Could not queue the alert for lead %s; the worker sweep will retry it", lead_id)
        return False


async def close_queue() -> None:
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None
