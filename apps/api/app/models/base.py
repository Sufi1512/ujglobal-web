import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class IdTimestampMixin:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SeoMixin:
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    meta_title: Mapped[str | None] = mapped_column(String(70))
    meta_description: Mapped[str | None] = mapped_column(String(170))
    canonical_url: Mapped[str | None] = mapped_column(Text)
    noindex: Mapped[bool] = mapped_column(default=False)
