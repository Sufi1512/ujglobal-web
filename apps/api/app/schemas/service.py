from pydantic import BaseModel, ConfigDict


class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    tagline: str | None
    summary: str
    deliverables: list[str]
    tech_stack: list[str]
    meta_title: str | None
    meta_description: str | None
