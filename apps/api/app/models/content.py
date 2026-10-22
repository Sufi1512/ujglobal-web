import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Index, String, Table, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdTimestampMixin, SeoMixin


class PublishStatus(enum.StrEnum):
    draft = "draft"
    scheduled = "scheduled"
    published = "published"


publish_status = Enum(PublishStatus, name="publish_status")

service_case_studies = Table(
    "service_case_studies",
    Base.metadata,
    Column("service_id", ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
    Column("case_study_id", ForeignKey("case_studies.id", ondelete="CASCADE"), primary_key=True),
)

post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Service(IdTimestampMixin, SeoMixin, Base):
    __tablename__ = "services"

    title: Mapped[str] = mapped_column(String(160))
    tagline: Mapped[str | None] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text)
    body: Mapped[dict | None] = mapped_column(JSONB)
    deliverables: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    tech_stack: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    sort_order: Mapped[int] = mapped_column(default=0)
    status: Mapped[PublishStatus] = mapped_column(publish_status, default=PublishStatus.draft)

    case_studies: Mapped[list["CaseStudy"]] = relationship(
        secondary=service_case_studies, back_populates="services"
    )


class CaseStudy(IdTimestampMixin, SeoMixin, Base):
    __tablename__ = "case_studies"

    title: Mapped[str] = mapped_column(String(200))
    client_name: Mapped[str | None] = mapped_column(String(160))
    challenge: Mapped[str | None] = mapped_column(Text)
    solution: Mapped[str | None] = mapped_column(Text)
    results: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    tech_stack: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    live_url: Mapped[str | None] = mapped_column(Text)
    is_featured: Mapped[bool] = mapped_column(default=False)
    is_demo: Mapped[bool] = mapped_column(default=False)
    status: Mapped[PublishStatus] = mapped_column(publish_status, default=PublishStatus.draft)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    services: Mapped[list[Service]] = relationship(
        secondary=service_case_studies, back_populates="case_studies"
    )

    __table_args__ = (Index("ix_case_studies_status_published", "status", "published_at"),)


class Category(IdTimestampMixin, Base):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(80))
    slug: Mapped[str] = mapped_column(String(100), unique=True)


class Tag(IdTimestampMixin, Base):
    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(String(80))
    slug: Mapped[str] = mapped_column(String(100), unique=True)


class Post(IdTimestampMixin, SeoMixin, Base):
    __tablename__ = "posts"

    title: Mapped[str] = mapped_column(String(200))
    excerpt: Mapped[str | None] = mapped_column(Text)
    content_json: Mapped[dict | None] = mapped_column(JSONB)
    content_html: Mapped[str | None] = mapped_column(Text)
    author_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"))
    reading_minutes: Mapped[int | None]
    status: Mapped[PublishStatus] = mapped_column(publish_status, default=PublishStatus.draft)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    tags: Mapped[list[Tag]] = relationship(secondary=post_tags)

    __table_args__ = (Index("ix_posts_status_published", "status", "published_at"),)
