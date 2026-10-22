from fastapi import APIRouter, Request, status

from app.core.client import client_ip, hash_ip
from app.core.db import SessionDep
from app.models import Lead, LeadSource
from app.schemas.lead import ContactIn, LeadCreated

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("/contact", response_model=LeadCreated, status_code=status.HTTP_201_CREATED)
async def create_contact_lead(payload: ContactIn, request: Request, session: SessionDep) -> LeadCreated:
    # Bots that fill the honeypot get a normal-looking response but nothing is stored.
    if payload.website:
        return LeadCreated(id=None)

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
        ip_hash=hash_ip(client_ip(request)),
    )
    session.add(lead)
    await session.commit()
    # Email notification to the team is queued from here once the worker lands (Phase 1).
    return LeadCreated(id=lead.id)
