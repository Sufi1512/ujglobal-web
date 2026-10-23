from fastapi import APIRouter, HTTPException, Request, status

from app.core import ratelimit, turnstile
from app.core.client import client_ip, hash_ip
from app.core.config import get_settings
from app.core.db import SessionDep
from app.models import Lead, LeadSource
from app.schemas.lead import ContactIn, LeadCreated
from app.workers.queue import queue_lead_alert

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("/contact", response_model=LeadCreated, status_code=status.HTTP_201_CREATED)
async def create_contact_lead(payload: ContactIn, request: Request, session: SessionDep) -> LeadCreated:
    settings = get_settings()
    ip = client_ip(request)
    # Bots that fill the honeypot get a normal-looking response but nothing is stored.
    if payload.website:
        return LeadCreated(id=None)

    decision = await ratelimit.hit(
        "contact-ip", ip, settings.contact_max_per_ip, settings.contact_window_seconds
    )
    if not decision.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You've sent several messages already. Please wait a while, or email us directly.",
            headers={"Retry-After": str(decision.retry_after)},
        )
    if not await turnstile.verify(payload.turnstile_token, ip):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete the security check and send again.",
        )

    lead = Lead(
        name=payload.name.strip(),
        email=str(payload.email).lower(),
        company=payload.company,
        phone=payload.phone,
        message=payload.message.strip(),
        source=LeadSource.contact,
        landing_page=payload.landing_page,
        referrer=payload.referrer,
        utm=payload.utm,
        consent=payload.consent,
        ip_hash=hash_ip(ip),
    )
    session.add(lead)
    await session.commit()
    # Saved first, emailed second: the team alert goes through the worker and never blocks or loses a lead.
    await queue_lead_alert(lead.id)
    return LeadCreated(id=lead.id)
