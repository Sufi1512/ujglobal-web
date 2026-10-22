import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdTimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class LeadSource(enum.StrEnum):
    contact = "contact"
    wizard = "wizard"
    chat = "chat"
    booking = "booking"


class LeadStatus(enum.StrEnum):
    new = "new"
    contacted = "contacted"
    qualified = "qualified"
    proposal = "proposal"
    won = "won"
    lost = "lost"


class Lead(IdTimestampMixin, Base):
    """Every contact submission lands here; the admin inbox replaces a CRM."""

    __tablename__ = "leads"

    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(320), index=True)
    phone: Mapped[str | None] = mapped_column(String(40))
    company: Mapped[str | None] = mapped_column(String(160))
    source: Mapped[LeadSource] = mapped_column(Enum(LeadSource, name="lead_source"))
    services: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    budget_range: Mapped[str | None] = mapped_column(String(60))
    timeline: Mapped[str | None] = mapped_column(String(60))
    message: Mapped[str] = mapped_column(Text)
    brief: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[LeadStatus] = mapped_column(Enum(LeadStatus, name="lead_status"), default=LeadStatus.new)
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    ai_summary: Mapped[str | None] = mapped_column(Text)
    ai_score: Mapped[int | None]
    utm: Mapped[dict | None] = mapped_column(JSONB)
    landing_page: Mapped[str | None] = mapped_column(Text)
    referrer: Mapped[str | None] = mapped_column(Text)
    ip_hash: Mapped[str | None] = mapped_column(String(64))
    consent: Mapped[bool] = mapped_column(default=False)
    # When the team alert email went out. Null means not sent yet; the worker retries those.
    notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    notes: Mapped[list["LeadNote"]] = relationship(back_populates="lead", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_leads_status_created", "status", "created_at"),)


class LeadNote(IdTimestampMixin, Base):
    __tablename__ = "lead_notes"

    lead_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    body: Mapped[str] = mapped_column(Text)

    lead: Mapped[Lead] = relationship(back_populates="notes")
    author: Mapped["User | None"] = relationship()


class Subscriber(IdTimestampMixin, Base):
    __tablename__ = "subscribers"

    email: Mapped[str] = mapped_column(String(320), unique=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source: Mapped[str | None] = mapped_column(String(60))
