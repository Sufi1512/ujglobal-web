"""Privacy promises made on the website: owners can delete a lead on request, and old leads expire."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password
from app.models import AuditLog, AuthSession, Lead, LeadNote, LeadSource, LeadStatus, User, UserRole
from app.workers.tasks import purge_expired_data

NOW = datetime.now(UTC)


async def make_user(session_factory, role: UserRole) -> User:
    async with session_factory() as session:
        user = User(
            email=f"{role.value}@ujglobal.tech",
            name=role.value.title(),
            role=role,
            password_hash=hash_password("x" * 12),
        )
        session.add(user)
        await session.commit()
        return user


def auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)[0]}"}


def lead(**overrides) -> Lead:
    values = {
        "id": uuid.uuid4(),
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "message": "We need an AI assistant.",
        "source": LeadSource.contact,
        "consent": True,
    }
    values.update(overrides)
    return Lead(**values)


async def count(session_factory, model) -> int:
    async with session_factory() as session:
        return await session.scalar(select(func.count()).select_from(model)) or 0


# --- Deleting a lead on request ---------------------------------------------------------------------


async def test_owner_can_delete_a_lead_and_no_personal_data_is_left(client, session_factory):
    owner = await make_user(session_factory, UserRole.owner)
    row = lead()
    async with session_factory() as session:
        session.add(row)
        await session.flush()
        session.add(LeadNote(lead_id=row.id, author_id=owner.id, body="Called Ada"))
        await session.commit()

    res = await client.delete(f"/v1/admin/leads/{row.id}", headers=auth(owner))
    assert res.status_code == 204
    assert await count(session_factory, Lead) == 0
    assert await count(session_factory, LeadNote) == 0

    async with session_factory() as session:
        entry = await session.scalar(select(AuditLog))
    assert (entry.action, entry.entity, entry.user_id) == ("delete", "lead", owner.id)
    assert entry.diff["notes"] == 1
    text = str(entry.diff)
    assert "Ada" not in text and "ada@example.com" not in text and "AI assistant" not in text


async def test_only_owners_can_delete_leads(client, session_factory):
    sales = await make_user(session_factory, UserRole.sales)
    row = lead()
    async with session_factory() as session:
        session.add(row)
        await session.commit()
    assert (await client.delete(f"/v1/admin/leads/{row.id}", headers=auth(sales))).status_code == 403
    assert await count(session_factory, Lead) == 1


async def test_deleting_a_missing_lead_is_404(client, session_factory):
    owner = await make_user(session_factory, UserRole.owner)
    assert (await client.delete(f"/v1/admin/leads/{uuid.uuid4()}", headers=auth(owner))).status_code == 404


# --- Retention --------------------------------------------------------------------------------------


@pytest.fixture
def two_years(monkeypatch):
    monkeypatch.setattr(get_settings(), "lead_retention_days", 730)


async def test_retention_deletes_only_leads_with_no_recent_activity(session_factory, two_years):
    old = NOW - timedelta(days=800)
    stale = lead(created_at=old, updated_at=old)
    stale_lost = lead(created_at=old, updated_at=old, status=LeadStatus.lost)
    won_client = lead(created_at=old, updated_at=old, status=LeadStatus.won)
    recently_updated = lead(created_at=old, updated_at=NOW - timedelta(days=10))
    old_but_noted = lead(created_at=old, updated_at=old)
    fresh = lead()
    async with session_factory() as session:
        session.add_all([stale, stale_lost, won_client, recently_updated, old_but_noted, fresh])
        await session.flush()
        session.add(
            LeadNote(lead_id=old_but_noted.id, body="Followed up", created_at=NOW - timedelta(days=5))
        )
        session.add(LeadNote(lead_id=stale.id, body="Old note", created_at=old))
        await session.commit()

    result = await purge_expired_data({})
    assert result["leads"] == 2

    async with session_factory() as session:
        left = set(await session.scalars(select(Lead.id)))
        audits = list(await session.scalars(select(AuditLog)))
    assert left == {won_client.id, recently_updated.id, old_but_noted.id, fresh.id}
    assert sorted(a.diff["reason"] for a in audits) == ["retention", "retention"]
    assert all(a.user_id is None for a in audits)
    assert await count(session_factory, LeadNote) == 1  # the deleted lead's note went with it


async def test_retention_can_be_switched_off(session_factory, monkeypatch):
    monkeypatch.setattr(get_settings(), "lead_retention_days", 0)
    old = NOW - timedelta(days=5000)
    async with session_factory() as session:
        session.add(lead(created_at=old, updated_at=old))
        await session.commit()
    assert (await purge_expired_data({}))["leads"] == 0
    assert await count(session_factory, Lead) == 1


async def test_dead_sign_in_sessions_are_cleared(session_factory, two_years):
    owner = await make_user(session_factory, UserRole.owner)
    async with session_factory() as session:
        session.add_all(
            [
                AuthSession(user_id=owner.id, token_hash="a" * 64, expires_at=NOW - timedelta(days=40)),
                AuthSession(
                    user_id=owner.id,
                    token_hash="b" * 64,
                    expires_at=NOW + timedelta(days=5),
                    revoked_at=NOW - timedelta(days=31),
                ),
                AuthSession(user_id=owner.id, token_hash="c" * 64, expires_at=NOW + timedelta(days=5)),
                AuthSession(user_id=owner.id, token_hash="d" * 64, expires_at=NOW - timedelta(days=2)),
            ]
        )
        await session.commit()
    assert (await purge_expired_data({}))["sessions"] == 2
    assert await count(session_factory, AuthSession) == 2


async def test_lead_changes_and_notes_are_audited_without_their_text(client, session_factory):
    owner = await make_user(session_factory, UserRole.owner)
    row = lead()
    async with session_factory() as session:
        session.add(row)
        await session.commit()

    await client.patch(f"/v1/admin/leads/{row.id}", headers=auth(owner), json={"status": "contacted"})
    await client.patch(
        f"/v1/admin/leads/{row.id}", headers=auth(owner), json={"status": "contacted"}
    )  # no change
    await client.post(
        f"/v1/admin/leads/{row.id}/notes", headers=auth(owner), json={"body": "Ada's budget is 50k"}
    )

    async with session_factory() as session:
        entries = list(await session.scalars(select(AuditLog).order_by(AuditLog.created_at)))
    assert [(e.action, e.entity) for e in entries] == [("update", "lead"), ("create", "lead_note")]
    assert entries[0].diff == {"status": ["new", "contacted"]}
    assert "50k" not in str(entries[1].diff)
