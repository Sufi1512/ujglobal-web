import csv
import io
from datetime import UTC, datetime, timedelta

import pytest

from app.core.security import create_access_token, hash_password
from app.models import Lead, LeadSource, LeadStatus, User, UserRole


async def make_user(session_factory, role: UserRole, email: str, active: bool = True) -> User:
    async with session_factory() as session:
        user = User(
            email=email, name=email.split("@")[0].title(), role=role, password_hash=hash_password("x" * 12)
        )
        user.is_active = active
        session.add(user)
        await session.commit()
        return user


def auth(user: User) -> dict[str, str]:
    token, _ = create_access_token(user.id, user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def owner(session_factory) -> User:
    return await make_user(session_factory, UserRole.owner, "owner@ujglobal.tech")


@pytest.fixture
async def leads(session_factory) -> list[Lead]:
    now = datetime.now(UTC)
    rows = [
        Lead(
            name="Ada Lovelace",
            email="ada@example.com",
            company="Analytical Engines",
            message="Need an AI support assistant",
            source=LeadSource.contact,
            created_at=now - timedelta(days=3),
            utm={"utm_source": "google", "utm_campaign": "ai"},
            consent=True,
        ),
        Lead(
            name="Grace Hopper",
            email="grace@example.com",
            message="Mobile app for our fleet, 100% offline",
            source=LeadSource.contact,
            status=LeadStatus.qualified,
            created_at=now - timedelta(days=1),
        ),
        Lead(
            name="=HYPERLINK(evil)",
            email="mallory@example.com",
            message="@SUM(1+1) plain spam",
            source=LeadSource.wizard,
            created_at=now,
        ),
    ]
    async with session_factory() as session:
        session.add_all(rows)
        await session.commit()
    return rows


async def test_inbox_requires_login(client):
    assert (await client.get("/v1/admin/leads")).status_code == 401


async def test_editors_cannot_see_leads(client, session_factory, leads):
    editor = await make_user(session_factory, UserRole.editor, "editor@ujglobal.tech")
    assert (await client.get("/v1/admin/leads", headers=auth(editor))).status_code == 403
    assert (await client.get("/v1/admin/leads/export.csv", headers=auth(editor))).status_code == 403


async def test_list_is_newest_first_with_status_counts(client, owner, leads):
    res = await client.get("/v1/admin/leads", headers=auth(owner))
    assert res.status_code == 200
    body = res.json()
    assert [lead["email"] for lead in body["items"]] == [
        "mallory@example.com",
        "grace@example.com",
        "ada@example.com",
    ]
    assert body["total"] == 3
    assert body["status_counts"]["new"] == 2
    assert body["status_counts"]["qualified"] == 1
    assert body["status_counts"]["won"] == 0
    # The list stays light; the message and notes come with the detail view.
    assert "message" not in body["items"][0]


async def test_filters_and_search(client, owner, leads):
    async def emails(**params):
        res = await client.get("/v1/admin/leads", headers=auth(owner), params=params)
        assert res.status_code == 200
        return {lead["email"] for lead in res.json()["items"]}

    assert await emails(status="qualified") == {"grace@example.com"}
    assert await emails(source="wizard") == {"mallory@example.com"}
    assert await emails(q="analytical") == {"ada@example.com"}
    assert await emails(q="SUPPORT") == {"ada@example.com"}
    # % and _ are searched literally, not as wildcards.
    assert await emails(q="100%") == {"grace@example.com"}
    assert await emails(q="%") == {"grace@example.com"}
    assert await emails(assignee="none") == {"ada@example.com", "grace@example.com", "mallory@example.com"}
    assert await emails(assignee="me") == set()
    today = datetime.now(UTC).date()
    assert await emails(date_from=(today - timedelta(days=1)).isoformat()) == {
        "grace@example.com",
        "mallory@example.com",
    }
    assert await emails(date_to=(today - timedelta(days=2)).isoformat()) == {"ada@example.com"}

    res = await client.get("/v1/admin/leads", headers=auth(owner), params={"assignee": "bob"})
    assert res.status_code == 422


async def test_status_counts_ignore_the_status_filter(client, owner, leads):
    res = await client.get("/v1/admin/leads", headers=auth(owner), params={"status": "qualified"})
    assert res.json()["total"] == 1
    assert res.json()["status_counts"]["new"] == 2


async def test_pagination(client, owner, leads):
    res = await client.get("/v1/admin/leads", headers=auth(owner), params={"page": 2, "page_size": 2})
    body = res.json()
    assert body["total"] == 3
    assert [lead["email"] for lead in body["items"]] == ["ada@example.com"]
    assert (
        await client.get("/v1/admin/leads", headers=auth(owner), params={"page_size": 101})
    ).status_code == 422


async def test_detail_update_and_notes(client, session_factory, owner, leads):
    sales = await make_user(session_factory, UserRole.sales, "sam@ujglobal.tech")
    lead_id = str(leads[0].id)

    detail = await client.get(f"/v1/admin/leads/{lead_id}", headers=auth(sales))
    assert detail.status_code == 200
    assert detail.json()["message"] == "Need an AI support assistant"
    assert detail.json()["notes"] == []

    res = await client.patch(
        f"/v1/admin/leads/{lead_id}",
        headers=auth(sales),
        json={"status": "contacted", "assignee_id": str(sales.id)},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "contacted"
    assert res.json()["assignee_id"] == str(sales.id)

    mine = await client.get("/v1/admin/leads", headers=auth(sales), params={"assignee": "me"})
    assert [lead["id"] for lead in mine.json()["items"]] == [lead_id]

    # Sending only the status leaves the assignee alone; an explicit null unassigns.
    res = await client.patch(f"/v1/admin/leads/{lead_id}", headers=auth(sales), json={"status": "proposal"})
    assert res.json()["assignee_id"] == str(sales.id)
    res = await client.patch(f"/v1/admin/leads/{lead_id}", headers=auth(sales), json={"assignee_id": None})
    assert res.json()["assignee_id"] is None
    assert res.json()["status"] == "proposal"

    note = await client.post(
        f"/v1/admin/leads/{lead_id}/notes", headers=auth(sales), json={"body": " Called, keen. "}
    )
    assert note.status_code == 201
    assert note.json()["body"] == "Called, keen."
    assert note.json()["author_name"] == "Sam"
    await client.post(f"/v1/admin/leads/{lead_id}/notes", headers=auth(owner), json={"body": "Sent proposal"})

    notes = (await client.get(f"/v1/admin/leads/{lead_id}", headers=auth(owner))).json()["notes"]
    assert [n["body"] for n in notes] == ["Sent proposal", "Called, keen."]
    assert [n["author_name"] for n in notes] == ["Owner", "Sam"]


async def test_update_validation(client, session_factory, owner, leads):
    lead_id = str(leads[0].id)
    editor = await make_user(session_factory, UserRole.editor, "ed@ujglobal.tech")
    gone = await make_user(session_factory, UserRole.sales, "gone@ujglobal.tech", active=False)

    for bad in (
        {"status": None},
        {"status": "archived"},
        {"assignee_id": str(editor.id)},
        {"assignee_id": str(gone.id)},
    ):
        assert (
            await client.patch(f"/v1/admin/leads/{lead_id}", headers=auth(owner), json=bad)
        ).status_code == 422

    missing = "00000000-0000-0000-0000-000000000000"
    assert (await client.get(f"/v1/admin/leads/{missing}", headers=auth(owner))).status_code == 404
    assert (await client.patch(f"/v1/admin/leads/{missing}", headers=auth(owner), json={})).status_code == 404
    res = await client.post(f"/v1/admin/leads/{missing}/notes", headers=auth(owner), json={"body": "x"})
    assert res.status_code == 404
    res = await client.post(f"/v1/admin/leads/{lead_id}/notes", headers=auth(owner), json={"body": ""})
    assert res.status_code == 422


async def test_assignees_are_active_owner_and_sales_users(client, session_factory, owner):
    await make_user(session_factory, UserRole.sales, "sam@ujglobal.tech")
    await make_user(session_factory, UserRole.editor, "ed@ujglobal.tech")
    await make_user(session_factory, UserRole.sales, "gone@ujglobal.tech", active=False)
    res = await client.get("/v1/admin/leads/assignees", headers=auth(owner))
    assert [a["name"] for a in res.json()] == ["Owner", "Sam"]


async def test_csv_export_respects_filters_and_blocks_formulas(client, owner, leads):
    await client.patch(
        f"/v1/admin/leads/{leads[0].id}", headers=auth(owner), json={"assignee_id": str(owner.id)}
    )
    await client.post(f"/v1/admin/leads/{leads[0].id}/notes", headers=auth(owner), json={"body": "hi"})

    res = await client.get("/v1/admin/leads/export.csv", headers=auth(owner))
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "attachment" in res.headers["content-disposition"]
    rows = list(csv.DictReader(io.StringIO(res.text.lstrip("﻿"))))
    assert [r["email"] for r in rows] == ["mallory@example.com", "grace@example.com", "ada@example.com"]

    spam, _, ada = rows
    assert spam["name"] == "'=HYPERLINK(evil)"
    assert spam["message"] == "'@SUM(1+1) plain spam"
    assert ada["assignee"] == "Owner"
    assert ada["notes"] == "1"
    assert ada["utm_source"] == "google"
    assert ada["consent"] == "yes"

    filtered = await client.get(
        "/v1/admin/leads/export.csv", headers=auth(owner), params={"status": "qualified"}
    )
    assert [r["email"] for r in csv.DictReader(io.StringIO(filtered.text.lstrip("﻿")))] == [
        "grace@example.com"
    ]
