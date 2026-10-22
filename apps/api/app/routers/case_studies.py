from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.db import SessionDep
from app.models import CaseStudy, Service
from app.models.content import PublishStatus
from app.schemas.content import CaseStudyCard, CaseStudyPublic, ServiceRef

router = APIRouter(prefix="/case-studies", tags=["case studies"])


@router.get("", response_model=list[CaseStudyCard])
async def list_case_studies(
    session: SessionDep,
    service: Annotated[str | None, Query(description="Only case studies linked to this service slug")] = None,
    featured: bool | None = None,
) -> list[CaseStudy]:
    query = select(CaseStudy).where(CaseStudy.status == PublishStatus.published)
    if service:
        query = query.where(CaseStudy.services.any(Service.slug == service))
    if featured is not None:
        query = query.where(CaseStudy.is_featured == featured)
    query = query.order_by(CaseStudy.is_featured.desc(), CaseStudy.published_at.desc().nulls_last())
    return list(await session.scalars(query))


@router.get("/{slug}", response_model=CaseStudyPublic)
async def get_case_study(slug: str, session: SessionDep) -> CaseStudyPublic:
    case_study = await session.scalar(
        select(CaseStudy)
        .where(CaseStudy.slug == slug, CaseStudy.status == PublishStatus.published)
        .options(selectinload(CaseStudy.services))
    )
    if case_study is None:
        raise HTTPException(status_code=404, detail="Case study not found")
    out = CaseStudyPublic.model_validate(case_study)
    # Only link to services that are themselves live.
    live = sorted(
        (s for s in case_study.services if s.status == PublishStatus.published), key=lambda s: s.sort_order
    )
    out.services = [ServiceRef.model_validate(s) for s in live]
    return out
