"""Admin editing of services and case studies (owners and editors).

Every write is recorded in the audit log in the same transaction and then asks the website to refresh
the pages that show the content.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import audit
from app.core.auth import CurrentUser, require_roles
from app.core.db import SessionDep
from app.models import CaseStudy, Service, UserRole
from app.models.content import PublishStatus
from app.schemas.content import (
    CaseStudyAdminOut,
    CaseStudyIn,
    CaseStudyListItem,
    ServiceAdminOut,
    ServiceIn,
    ServiceListItem,
)
from app.workers.queue import queue_revalidation

router = APIRouter(
    prefix="/admin", tags=["admin: content"], dependencies=[Depends(require_roles(UserRole.editor))]
)

SERVICE_FIELDS = (
    "title", "slug", "tagline", "summary", "body", "deliverables", "tech_stack", "sort_order", "status",
    "meta_title", "meta_description", "noindex",
)  # fmt: skip
CASE_STUDY_FIELDS = (
    "title", "slug", "client_name", "summary", "challenge", "solution", "results", "tech_stack", "live_url",
    "is_demo", "is_featured", "status", "meta_title", "meta_description", "noindex",
)  # fmt: skip


def _snapshot(obj: Any, fields: tuple[str, ...]) -> dict[str, Any]:
    return {field: getattr(obj, field) for field in fields}


def _slug_taken() -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That URL slug is already used")


async def _ensure_slug_free(
    session: AsyncSession, model: type[Service] | type[CaseStudy], slug: str, own_id: uuid.UUID | None = None
) -> None:
    query = select(model.id).where(model.slug == slug)
    if own_id is not None:
        query = query.where(model.id != own_id)
    if await session.scalar(query) is not None:
        raise _slug_taken()


async def _commit(session: AsyncSession) -> None:
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        # The only unique column an editor controls is the slug.
        raise _slug_taken() from exc


# --- Services ---------------------------------------------------------------------------------------


async def _get_service(session: AsyncSession, service_id: uuid.UUID) -> Service:
    service = await session.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


def _service_values(payload: ServiceIn) -> dict[str, Any]:
    values = payload.model_dump(mode="json")
    values["status"] = PublishStatus(values["status"])
    return values


@router.get("/services", response_model=list[ServiceListItem])
async def list_services(session: SessionDep) -> list[Service]:
    return list(await session.scalars(select(Service).order_by(Service.sort_order, Service.title)))


@router.post("/services", response_model=ServiceAdminOut, status_code=status.HTTP_201_CREATED)
async def create_service(payload: ServiceIn, session: SessionDep, user: CurrentUser) -> Service:
    await _ensure_slug_free(session, Service, payload.slug)
    service = Service(**_service_values(payload))
    session.add(service)
    await session.flush()
    audit.record(session, user, "create", "service", service.id, _snapshot(service, SERVICE_FIELDS))
    await _commit(session)
    await session.refresh(service)
    await queue_revalidation("services", "case-studies")
    return service


@router.get("/services/{service_id}", response_model=ServiceAdminOut)
async def get_service(service_id: uuid.UUID, session: SessionDep) -> Service:
    return await _get_service(session, service_id)


@router.put("/services/{service_id}", response_model=ServiceAdminOut)
async def update_service(
    service_id: uuid.UUID, payload: ServiceIn, session: SessionDep, user: CurrentUser
) -> Service:
    service = await _get_service(session, service_id)
    await _ensure_slug_free(session, Service, payload.slug, service.id)
    before = _snapshot(service, SERVICE_FIELDS)
    for field, value in _service_values(payload).items():
        setattr(service, field, value)
    diff = audit.changes(before, _snapshot(service, SERVICE_FIELDS))
    if diff:
        audit.record(session, user, "update", "service", service.id, diff)
        await _commit(session)
        await session.refresh(service)
        await queue_revalidation("services", "case-studies")
    return service


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(service_id: uuid.UUID, session: SessionDep, user: CurrentUser) -> Response:
    service = await _get_service(session, service_id)
    if service.status == PublishStatus.published:
        raise HTTPException(
            status_code=409, detail="Unpublish the service (set it to draft) before deleting it"
        )
    audit.record(session, user, "delete", "service", service.id, _snapshot(service, SERVICE_FIELDS))
    await session.delete(service)
    await session.commit()
    await queue_revalidation("services", "case-studies")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Case studies ----------------------------------------------------------------------------------


async def _get_case_study(session: AsyncSession, case_study_id: uuid.UUID) -> CaseStudy:
    case_study = await session.scalar(
        select(CaseStudy)
        .where(CaseStudy.id == case_study_id)
        .options(selectinload(CaseStudy.services))
        .execution_options(populate_existing=True)
    )
    if case_study is None:
        raise HTTPException(status_code=404, detail="Case study not found")
    return case_study


def _case_study_out(case_study: CaseStudy) -> CaseStudyAdminOut:
    data = {field: getattr(case_study, field) for field in CASE_STUDY_FIELDS}
    return CaseStudyAdminOut(
        **data,
        id=case_study.id,
        published_at=case_study.published_at,
        service_ids=[s.id for s in case_study.services],
        created_at=case_study.created_at,
        updated_at=case_study.updated_at,
    )


def _case_study_snapshot(case_study: CaseStudy) -> dict[str, Any]:
    snapshot = _snapshot(case_study, CASE_STUDY_FIELDS)
    snapshot["service_ids"] = sorted(str(s.id) for s in case_study.services)
    return snapshot


async def _apply_case_study(session: AsyncSession, case_study: CaseStudy, payload: CaseStudyIn) -> None:
    values = payload.model_dump(mode="json", exclude={"service_ids"})
    values["status"] = PublishStatus(values["status"])
    for field, value in values.items():
        setattr(case_study, field, value)
    if case_study.status == PublishStatus.published and case_study.published_at is None:
        case_study.published_at = datetime.now(UTC)

    wanted = set(payload.service_ids)
    services = list(await session.scalars(select(Service).where(Service.id.in_(wanted)))) if wanted else []
    if len(services) != len(wanted):
        raise HTTPException(status_code=422, detail="One or more linked services don't exist")
    case_study.services = services


@router.get("/case-studies", response_model=list[CaseStudyListItem])
async def list_case_studies(session: SessionDep) -> list[CaseStudy]:
    return list(await session.scalars(select(CaseStudy).order_by(CaseStudy.updated_at.desc())))


@router.post("/case-studies", response_model=CaseStudyAdminOut, status_code=status.HTTP_201_CREATED)
async def create_case_study(
    payload: CaseStudyIn, session: SessionDep, user: CurrentUser
) -> CaseStudyAdminOut:
    await _ensure_slug_free(session, CaseStudy, payload.slug)
    case_study = CaseStudy(services=[])
    await _apply_case_study(session, case_study, payload)
    session.add(case_study)
    await session.flush()
    audit.record(session, user, "create", "case_study", case_study.id, _case_study_snapshot(case_study))
    await _commit(session)
    await queue_revalidation("case-studies")
    return _case_study_out(await _get_case_study(session, case_study.id))


@router.get("/case-studies/{case_study_id}", response_model=CaseStudyAdminOut)
async def get_case_study(case_study_id: uuid.UUID, session: SessionDep) -> CaseStudyAdminOut:
    return _case_study_out(await _get_case_study(session, case_study_id))


@router.put("/case-studies/{case_study_id}", response_model=CaseStudyAdminOut)
async def update_case_study(
    case_study_id: uuid.UUID, payload: CaseStudyIn, session: SessionDep, user: CurrentUser
) -> CaseStudyAdminOut:
    case_study = await _get_case_study(session, case_study_id)
    await _ensure_slug_free(session, CaseStudy, payload.slug, case_study.id)
    before = _case_study_snapshot(case_study)
    await _apply_case_study(session, case_study, payload)
    diff = audit.changes(before, _case_study_snapshot(case_study))
    if diff:
        audit.record(session, user, "update", "case_study", case_study.id, diff)
        await _commit(session)
        await queue_revalidation("case-studies")
    return _case_study_out(await _get_case_study(session, case_study_id))


@router.delete("/case-studies/{case_study_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case_study(case_study_id: uuid.UUID, session: SessionDep, user: CurrentUser) -> Response:
    case_study = await _get_case_study(session, case_study_id)
    if case_study.status == PublishStatus.published:
        raise HTTPException(
            status_code=409, detail="Unpublish the case study (set it to draft) before deleting it"
        )
    audit.record(session, user, "delete", "case_study", case_study.id, _case_study_snapshot(case_study))
    await session.delete(case_study)
    await session.commit()
    await queue_revalidation("case-studies")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
