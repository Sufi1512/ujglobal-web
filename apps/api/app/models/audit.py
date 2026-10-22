import uuid

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdTimestampMixin


class AuditLog(IdTimestampMixin, Base):
    """Who changed what in the admin panel. Rows are only ever added."""

    __tablename__ = "audit_log"

    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(20))  # create, update, delete
    entity: Mapped[str] = mapped_column(String(40))  # service, case_study, lead, ...
    entity_id: Mapped[uuid.UUID] = mapped_column()
    # For updates {field: [old, new]}; for creates and deletes a snapshot of the record.
    diff: Mapped[dict] = mapped_column(JSONB, default=dict)

    __table_args__ = (Index("ix_audit_log_entity", "entity", "entity_id", "created_at"),)
