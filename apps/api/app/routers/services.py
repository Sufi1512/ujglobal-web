from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.db import SessionDep
from app.models import CaseStudy, Service
from app.models.content import PublishStatus
from app.schemas.content import CaseStudyCard
from app.schemas.service import ServiceDetail, ServiceOut

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceOut])
async def list_services(session: SessionDep) -> list[Service]:
    result = await session.scalars(
        select(Service)
        .where(Service.status == PublishStatus.published)
        .order_by(Service.sort_order, Service.title)
    )
    return list(result)


@router.get("/{slug}", response_model=ServiceDetail)
async def get_service(slug: str, session: SessionDep) -> ServiceDetail:
    service = await session.scalar(
        select(Service)
        .where(Service.slug == slug, Service.status == PublishStatus.published)
        .options(selectinload(Service.case_studies))
    )
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    published = [c for c in service.case_studies if c.status == PublishStatus.published]
    published.sort(key=_card_order)
    detail = ServiceDetail.model_validate(service, from_attributes=True)
    detail.case_studies = [CaseStudyCard.model_validate(c) for c in published]
    return detail


def _card_order(case_study: CaseStudy) -> tuple[bool, float]:
    # Featured first, then newest.
    published = case_study.published_at.timestamp() if case_study.published_at else 0.0
    return (not case_study.is_featured, -published)
