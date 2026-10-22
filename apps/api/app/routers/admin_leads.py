"""Admin leads inbox. Used instead of a CRM: every lead lives in Postgres and is worked from here."""

import csv
import io
import uuid
from collections.abc import Iterator
from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import selectinload

from app.core import audit
from app.core.auth import CurrentUser, require_roles
from app.core.db import SessionDep
from app.models import Lead, LeadNote, LeadSource, LeadStatus, User, UserRole
from app.schemas.lead import Assignee, LeadDetail, LeadNoteOut, LeadPage, LeadSummary, LeadUpdate, NoteIn

# Leads hold contact details, so only owners and sales see them.
router = APIRouter(
    prefix="/admin/leads", tags=["admin: leads"], dependencies=[Depends(require_roles(UserRole.sales))]
)

EXPORT_LIMIT = 50_000


def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class LeadFilters:
    def __init__(
        self,
        user: CurrentUser,
        status_: Annotated[LeadStatus | None, Query(alias="status")] = None,
        source: LeadSource | None = None,
        assignee: Annotated[
            str | None, Query(description="A user id, `me`, or `none` for unassigned leads")
        ] = None,
        q: Annotated[
            str | None, Query(max_length=200, description="Search name, email, company, message")
        ] = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> None:
        self.user = user
        self.status = status_
        self.source = source
        self.assignee = assignee
        self.q = q.strip() if q else None
        self.date_from = date_from
        self.date_to = date_to

    def apply(self, query: Select, *, with_status: bool = True) -> Select:
        if with_status and self.status:
            query = query.where(Lead.status == self.status)
        if self.source:
            query = query.where(Lead.source == self.source)
        if self.assignee == "me":
            query = query.where(Lead.assignee_id == self.user.id)
        elif self.assignee == "none":
            query = query.where(Lead.assignee_id.is_(None))
        elif self.assignee:
            try:
                query = query.where(Lead.assignee_id == uuid.UUID(self.assignee))
            except ValueError as exc:
                raise HTTPException(status_code=422, detail="assignee must be a user id, me or none") from exc
        if self.q:
            pattern = f"%{_escape_like(self.q)}%"
            query = query.where(
                or_(
                    Lead.name.ilike(pattern),
                    Lead.email.ilike(pattern),
                    Lead.company.ilike(pattern),
                    Lead.message.ilike(pattern),
                )
            )
        # Dates are whole UTC days, inclusive at both ends.
        if self.date_from:
            query = query.where(Lead.created_at >= datetime.combine(self.date_from, time.min, tzinfo=UTC))
        if self.date_to:
            end = datetime.combine(self.date_to + timedelta(days=1), time.min, tzinfo=UTC)
            query = query.where(Lead.created_at < end)
        return query


Filters = Annotated[LeadFilters, Depends()]


async def _get_lead(session: SessionDep, lead_id: uuid.UUID) -> Lead:
    lead = await session.scalar(
        select(Lead).where(Lead.id == lead_id).options(selectinload(Lead.notes).selectinload(LeadNote.author))
    )
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


def _detail(lead: Lead) -> LeadDetail:
    detail = LeadDetail.model_validate(lead)
    detail.notes = [
        LeadNoteOut.model_validate(note).model_copy(
            update={"author_name": note.author.name if note.author else None}
        )
        for note in sorted(lead.notes, key=lambda n: n.created_at, reverse=True)
    ]
    return detail


@router.get("", response_model=LeadPage)
async def list_leads(
    session: SessionDep,
    filters: Filters,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
) -> LeadPage:
    query = filters.apply(select(Lead))
    total = await session.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = await session.scalars(
        query.order_by(Lead.created_at.desc(), Lead.id).offset((page - 1) * page_size).limit(page_size)
    )

    # Tab counts honour every filter except status itself.
    count_query = filters.apply(select(Lead.status, func.count()).group_by(Lead.status), with_status=False)
    counts = {LeadStatus(s): n for s, n in (await session.execute(count_query)).all()}

    return LeadPage(
        items=[LeadSummary.model_validate(lead) for lead in rows],
        total=total,
        page=page,
        page_size=page_size,
        status_counts={s: counts.get(s, 0) for s in LeadStatus},
    )


def _csv_safe(value: object) -> str:
    """Stops spreadsheet apps from running a lead's text as a formula (CSV injection)."""
    text = "" if value is None else str(value)
    return f"'{text}" if text[:1] in {"=", "+", "-", "@", "\t", "\r"} else text


@router.get("/export.csv", response_class=StreamingResponse)
async def export_leads(session: SessionDep, filters: Filters) -> StreamingResponse:
    users = {u.id: u.name for u in await session.scalars(select(User))}
    rows = list(
        await session.scalars(
            filters.apply(select(Lead)).order_by(Lead.created_at.desc()).limit(EXPORT_LIMIT)
        )
    )
    note_counts = dict(
        (
            await session.execute(
                select(LeadNote.lead_id, func.count())
                .where(LeadNote.lead_id.in_([r.id for r in rows]))
                .group_by(LeadNote.lead_id)
            )
        ).all()
    )

    header = [
        "created_at", "name", "email", "phone", "company", "source", "status", "services", "budget_range",
        "timeline", "message", "assignee", "notes", "landing_page", "referrer", "utm_source", "utm_medium",
        "utm_campaign", "consent", "id",
    ]  # fmt: skip

    def generate() -> Iterator[str]:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        buffer.write("﻿")  # BOM so Excel opens UTF-8 names correctly
        writer.writerow(header)
        for lead in rows:
            utm = lead.utm or {}
            writer.writerow(
                _csv_safe(v)
                for v in (
                    lead.created_at.isoformat(timespec="seconds"),
                    lead.name,
                    lead.email,
                    lead.phone,
                    lead.company,
                    lead.source.value,
                    lead.status.value,
                    "; ".join(lead.services or []),
                    lead.budget_range,
                    lead.timeline,
                    lead.message,
                    users.get(lead.assignee_id) if lead.assignee_id else "",
                    note_counts.get(lead.id, 0),
                    lead.landing_page,
                    lead.referrer,
                    utm.get("utm_source") or utm.get("source"),
                    utm.get("utm_medium") or utm.get("medium"),
                    utm.get("utm_campaign") or utm.get("campaign"),
                    "yes" if lead.consent else "no",
                    lead.id,
                )
            )
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate()
        yield buffer.getvalue()

    filename = f"ujglobal-leads-{date.today().isoformat()}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "no-store"},
    )


@router.get("/assignees", response_model=list[Assignee])
async def list_assignees(session: SessionDep) -> list[User]:
    """People a lead can be assigned to: active owners and sales users."""
    result = await session.scalars(
        select(User)
        .where(User.is_active, User.role.in_([UserRole.owner, UserRole.sales]))
        .order_by(User.name)
    )
    return list(result)


@router.get("/{lead_id}", response_model=LeadDetail)
async def get_lead(lead_id: uuid.UUID, session: SessionDep) -> LeadDetail:
    return _detail(await _get_lead(session, lead_id))


@router.patch("/{lead_id}", response_model=LeadDetail)
async def update_lead(
    lead_id: uuid.UUID, payload: LeadUpdate, session: SessionDep, user: CurrentUser
) -> LeadDetail:
    lead = await _get_lead(session, lead_id)
    changes = payload.model_fields_set
    before = {"status": lead.status, "assignee_id": lead.assignee_id}

    if "status" in changes:
        if payload.status is None:
            raise HTTPException(status_code=422, detail="status cannot be empty")
        lead.status = payload.status
    if "assignee_id" in changes:
        if payload.assignee_id is not None:
            assignee = await session.get(User, payload.assignee_id)
            if assignee is None or not assignee.is_active or assignee.role == UserRole.editor:
                raise HTTPException(
                    status_code=422, detail="Leads can only be assigned to active owner or sales users"
                )
        lead.assignee_id = payload.assignee_id

    diff = audit.changes(before, {"status": lead.status, "assignee_id": lead.assignee_id})
    if diff:
        audit.record(session, user, "update", "lead", lead.id, diff)
    await session.commit()
    return _detail(await _get_lead(session, lead_id))


@router.delete(
    "/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles())],
    summary="Delete a lead and its notes (owners only), e.g. on a privacy request",
)
async def delete_lead(lead_id: uuid.UUID, session: SessionDep, user: CurrentUser) -> Response:
    lead = await _get_lead(session, lead_id)
    # The audit row records that a lead was deleted, never who it was: no personal data survives a deletion.
    audit.record(
        session,
        user,
        "delete",
        "lead",
        lead.id,
        {
            "source": lead.source,
            "status": lead.status,
            "created_at": lead.created_at,
            "notes": len(lead.notes),
        },
    )
    await session.delete(lead)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{lead_id}/notes", response_model=LeadNoteOut, status_code=status.HTTP_201_CREATED)
async def add_note(
    lead_id: uuid.UUID, payload: NoteIn, session: SessionDep, user: CurrentUser
) -> LeadNoteOut:
    await _get_lead(session, lead_id)
    note = LeadNote(lead_id=lead_id, author_id=user.id, body=payload.body.strip())
    session.add(note)
    await session.flush()
    # The note's text stays out of the audit trail, so deleting the lead leaves no personal data behind.
    audit.record(session, user, "create", "lead_note", lead_id, {"note_id": note.id})
    await session.commit()
    return LeadNoteOut.model_validate(note).model_copy(update={"author_name": user.name})
