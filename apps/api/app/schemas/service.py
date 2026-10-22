from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.content import CaseStudyCard, ServiceBody


class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    tagline: str | None
    summary: str
    body: ServiceBody = Field(default_factory=ServiceBody)
    deliverables: list[str]
    tech_stack: list[str]
    meta_title: str | None
    meta_description: str | None
    noindex: bool
    updated_at: datetime

    @field_validator("body", mode="before")
    @classmethod
    def empty_body(cls, value: object) -> object:
        return value or {}


class ServiceDetail(ServiceOut):
    # Published case studies linked to this service, featured first.
    case_studies: list[CaseStudyCard] = []
