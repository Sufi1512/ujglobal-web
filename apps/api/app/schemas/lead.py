import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import LeadSource, LeadStatus


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


class LeadNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    body: str
    author_id: uuid.UUID | None
    author_name: str | None = None
    created_at: datetime


class LeadSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    company: str | None
    source: LeadSource
    status: LeadStatus
    services: list[str]
    assignee_id: uuid.UUID | None
    created_at: datetime


class LeadDetail(LeadSummary):
    phone: str | None
    message: str
    budget_range: str | None
    timeline: str | None
    brief: dict | None
    landing_page: str | None
    referrer: str | None
    utm: dict | None
    consent: bool
    ai_summary: str | None
    ai_score: int | None
    updated_at: datetime
    notes: list[LeadNoteOut] = []


class LeadPage(BaseModel):
    items: list[LeadSummary]
    total: int
    page: int
    page_size: int
    # Count per status across the whole inbox, for the filter tabs.
    status_counts: dict[LeadStatus, int]


class LeadUpdate(BaseModel):
    status: LeadStatus | None = None
    assignee_id: uuid.UUID | None = None


class NoteIn(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class Assignee(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    role: str
