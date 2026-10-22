from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.db import SessionDep
from app.models import Service
from app.models.content import PublishStatus
from app.schemas.service import ServiceOut

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceOut])
async def list_services(session: SessionDep) -> list[Service]:
    result = await session.scalars(
        select(Service).where(Service.status == PublishStatus.published).order_by(Service.sort_order)
    )
    return list(result)


@router.get("/{slug}", response_model=ServiceOut)
async def get_service(slug: str, session: SessionDep) -> Service:
    service = await session.scalar(
        select(Service).where(Service.slug == slug, Service.status == PublishStatus.published)
    )
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return service
