import hashlib

from fastapi import APIRouter, Request, status

from app.core.config import get_settings
from app.core.db import SessionDep
from app.models import Lead, LeadSource
from app.schemas.lead import ContactIn, LeadCreated

router = APIRouter(prefix="/leads", tags=["leads"])


def hash_ip(ip: str | None) -> str | None:
    if not ip:
        return None
    return hashlib.sha256(f"{get_settings().ip_hash_salt}:{ip}".encode()).hexdigest()


@router.post("/contact", response_model=LeadCreated, status_code=status.HTTP_201_CREATED)
async def create_contact_lead(payload: ContactIn, request: Request, session: SessionDep) -> LeadCreated:
    # Bots that fill the honeypot get a normal-looking response but nothing is stored.
    if payload.website:
        return LeadCreated(id=None)

    client_ip = request.headers.get("cf-connecting-ip") or (request.client.host if request.client else None)
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
        ip_hash=hash_ip(client_ip),
    )
    session.add(lead)
    await session.commit()
    # Email notification to the team is queued from here once the worker lands (Phase 1).
    return LeadCreated(id=lead.id)
