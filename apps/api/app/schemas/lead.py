import uuid

from pydantic import BaseModel, EmailStr, Field


class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    company: str | None = Field(default=None, max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    message: str = Field(min_length=10, max_length=5000)
    landing_page: str | None = Field(default=None, max_length=500)
    referrer: str | None = Field(default=None, max_length=500)
    utm: dict[str, str] | None = None
    consent: bool = False
    # Honeypot field: real visitors never see it, bots fill it in.
    website: str | None = None


class LeadCreated(BaseModel):
    id: uuid.UUID | None
    ok: bool = True
