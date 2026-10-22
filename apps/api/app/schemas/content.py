"""Schemas for services and case studies: admin editing and the public read API."""

import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, field_validator

from app.models.content import PublishStatus

Slug = Annotated[
    str,
    StringConstraints(strip_whitespace=True, to_lower=True, min_length=2, max_length=160),
    Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", description="Lowercase words joined by hyphens"),
]
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


def _no_blank_or_duplicate(items: list[str]) -> list[str]:
    seen: list[str] = []
    for item in items:
        if item not in seen:
            seen.append(item)
    return seen


TextList = Annotated[list[ShortText], Field(max_length=30), AfterValidator(_no_blank_or_duplicate)]

# Admins publish or keep a draft; scheduled publishing comes with the blog in Phase 2.
EditableStatus = Literal[PublishStatus.draft, PublishStatus.published]


class _Seo(BaseModel):
    meta_title: Annotated[str, StringConstraints(strip_whitespace=True, max_length=70)] | None = None
    meta_description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=170)] | None = None
    noindex: bool = False

    @field_validator("meta_title", "meta_description", mode="after")
    @classmethod
    def blank_is_none(cls, value: str | None) -> str | None:
        return value or None


# --- Services ---------------------------------------------------------------------------------------


class ProcessStep(BaseModel):
    title: ShortText
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=600)]


class Faq(BaseModel):
    question: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=200)]
    answer: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class ServiceBody(BaseModel):
    """The rich sections of a service page. All optional; the page shows the ones that are filled in."""

    problem: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] | None = None
    process: list[ProcessStep] = Field(default_factory=list, max_length=8)
    faqs: list[Faq] = Field(default_factory=list, max_length=15)

    @field_validator("problem", mode="after")
    @classmethod
    def blank_is_none(cls, value: str | None) -> str | None:
        return value or None


class ServiceIn(_Seo):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=160)]
    slug: Slug
    tagline: Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)] | None = None
    summary: Annotated[str, StringConstraints(strip_whitespace=True, min_length=10, max_length=600)]
    body: ServiceBody = Field(default_factory=ServiceBody)
    deliverables: TextList = []
    tech_stack: TextList = []
    sort_order: int = Field(default=0, ge=0, le=1000)
    status: EditableStatus = PublishStatus.draft


class ServiceAdminOut(ServiceIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: PublishStatus  # type: ignore[assignment]
    created_at: datetime
    updated_at: datetime

    @field_validator("body", mode="before")
    @classmethod
    def empty_body(cls, value: object) -> object:
        return value or {}


class ServiceListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    slug: str
    status: PublishStatus
    sort_order: int
    updated_at: datetime


# --- Case studies ----------------------------------------------------------------------------------


class ResultMetric(BaseModel):
    metric: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]
    label: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


class CaseStudyIn(_Seo):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=200)]
    slug: Slug
    client_name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=160)] | None = None
    summary: Annotated[str, StringConstraints(strip_whitespace=True, max_length=400)] | None = None
    challenge: Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)] | None = None
    solution: Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)] | None = None
    results: list[ResultMetric] = Field(default_factory=list, max_length=6)
    tech_stack: TextList = []
    live_url: HttpUrl | None = None
    # No client work yet, so new case studies are demos unless someone says otherwise.
    is_demo: bool = True
    is_featured: bool = False
    status: EditableStatus = PublishStatus.draft
    service_ids: list[uuid.UUID] = Field(default_factory=list, max_length=10)

    @field_validator("client_name", "summary", "challenge", "solution", mode="after")
    @classmethod
    def blank_is_none(cls, value: str | None) -> str | None:
        return value or None


class CaseStudyAdminOut(_Seo):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    slug: str
    client_name: str | None
    summary: str | None
    challenge: str | None
    solution: str | None
    results: list[ResultMetric]
    tech_stack: list[str]
    live_url: str | None
    is_demo: bool
    is_featured: bool
    status: PublishStatus
    published_at: datetime | None
    service_ids: list[uuid.UUID]
    created_at: datetime
    updated_at: datetime


class CaseStudyListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    slug: str
    status: PublishStatus
    is_demo: bool
    is_featured: bool
    updated_at: datetime


# --- Public read API --------------------------------------------------------------------------------


class CaseStudyCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    client_name: str | None
    summary: str | None
    results: list[ResultMetric]
    tech_stack: list[str]
    is_demo: bool
    is_featured: bool
    published_at: datetime | None
    noindex: bool


class ServiceRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str


class CaseStudyPublic(CaseStudyCard):
    challenge: str | None
    solution: str | None
    live_url: str | None
    meta_title: str | None
    meta_description: str | None
    services: list[ServiceRef]
    updated_at: datetime
