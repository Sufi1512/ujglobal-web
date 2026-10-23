"""ARQ worker entry point: `arq app.workers.main.WorkerSettings`."""

import logging
from typing import Any

from arq import cron

from app.core.db import engine
from app.workers.queue import redis_settings
from app.workers.tasks import (
    RETRY_DELAYS,
    purge_expired_data,
    revalidate_web,
    send_lead_alert,
    send_security_alert,
    sweep_unsent_lead_alerts,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def shutdown(ctx: dict[str, Any]) -> None:
    await engine.dispose()


class WorkerSettings:
    functions = [send_lead_alert, revalidate_web, send_security_alert]
    cron_jobs = [
        cron(sweep_unsent_lead_alerts, second=0, run_at_startup=True),
        # Daily at 03:17 UTC, a quiet hour; off the hour so it doesn't pile onto other jobs.
        cron(purge_expired_data, hour=3, minute=17, second=0),
    ]
    redis_settings = redis_settings()
    on_shutdown = shutdown
    # One first attempt plus one per back-off step, then the sweep takes over for up to a week.
    max_tries = len(RETRY_DELAYS) + 1
    job_timeout = 60
    # Results aren't used. Keeping none also lets the sweep re-queue a lead whose job gave up.
    keep_result = 0
