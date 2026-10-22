import uuid

import pytest
from sqlalchemy import select

from app.core.security import create_access_token, hash_password
from app.models import AuditLog, User, UserRole

SERVICE = {
    "title": "AI Integration",
    "slug": "ai-integration",
    "tagline": "LLMs inside the tools you already use",
    "summary": "Add LLMs, retrieval and automation to your products and workflows.",
    "body": {
        "problem": "Your team copies data between systems by hand.",
        "process": [{"title": "Discover", "text": "Map the workflow."}],
        "faqs": [{"question": "Which models do you use?", "answer": "Whichever fits; often Claude."}],
    },
    "deliverables": ["Chatbots grounded in your data", "Chatbots grounded in your data", " Extraction "],
    "tech_stack": ["Python", "FastAPI"],
    "sort_order": 3,
    "status": "published",
    "meta_title": "AI integration services",
    "meta_description": "",
}

CASE_STUDY = {
    "title": "AI support assistant",
    "slug": "ai-support-assistant",
    "summary": "A chatbot that answers order questions from the help centre.",
    "challenge": "Support tickets doubled in a year.",
    "solution": "A retrieval-grounded assistant with human handoff.",
    "results": [{"metric": "62%", "label": "of questions answered without an agent"}],
    "tech_stack": ["Next.js", "Claude"],
    "live_url": "https://demo.ujglobal.tech/support",
    "status": "published",
}


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


@pytest.fixture
async def editor(session_factory) -> User:
    return await make_user(session_factory, UserRole.editor)


async def audit_rows(session_factory) -> list[AuditLog]:
    async with session_factory() as session:
        return list(await session.scalars(select(AuditLog).order_by(AuditLog.created_at)))


# --- Access ------------------------------------------------------------------------------------------


async def test_sales_and_anonymous_users_cannot_edit_content(client, session_factory):
    sales = await make_user(session_factory, UserRole.sales)
    assert (await client.get("/v1/admin/services")).status_code == 401
    assert (await client.get("/v1/admin/services", headers=auth(sales))).status_code == 403
    assert (
        await client.post("/v1/admin/case-studies", headers=auth(sales), json=CASE_STUDY)
    ).status_code == 403


# --- Services ----------------------------------------------------------------------------------------


async def test_create_service_publishes_it_and_logs_it(client, editor, session_factory, queued_revalidations):
    res = await client.post("/v1/admin/services", headers=auth(editor), json=SERVICE)
    assert res.status_code == 201, res.text
    body = res.json()
    # Duplicates and stray spaces are cleaned; an empty meta description is stored as nothing.
    assert body["deliverables"] == ["Chatbots grounded in your data", "Extraction"]
    assert body["meta_description"] is None
    assert body["body"]["faqs"][0]["question"] == "Which models do you use?"

    public = await client.get("/v1/services/ai-integration")
    assert public.status_code == 200
    assert public.json()["body"]["problem"] == "Your team copies data between systems by hand."
    assert public.json()["case_studies"] == []

    [row] = await audit_rows(session_factory)
    assert (row.action, row.entity, row.user_id) == ("create", "service", editor.id)
    assert row.diff["slug"] == "ai-integration"
    assert queued_revalidations == [{"services", "case-studies"}]


async def test_update_service_records_only_what_changed(
    client, editor, session_factory, queued_revalidations
):
    service_id = (await client.post("/v1/admin/services", headers=auth(editor), json=SERVICE)).json()["id"]

    res = await client.put(
        f"/v1/admin/services/{service_id}", headers=auth(editor), json={**SERVICE, "title": "AI Integrations"}
    )
    assert res.status_code == 200
    assert res.json()["title"] == "AI Integrations"

    rows = await audit_rows(session_factory)
    assert rows[-1].action == "update"
    assert rows[-1].diff == {"title": ["AI Integration", "AI Integrations"]}

    # Saving without changes doesn't log or refresh the site.
    await client.put(
        f"/v1/admin/services/{service_id}", headers=auth(editor), json={**SERVICE, "title": "AI Integrations"}
    )
    assert len(await audit_rows(session_factory)) == 2
    assert len(queued_revalidations) == 2


async def test_drafts_are_hidden_from_the_public_site(client, editor):
    await client.post("/v1/admin/services", headers=auth(editor), json={**SERVICE, "status": "draft"})
    assert (await client.get("/v1/services/ai-integration")).status_code == 404
    assert (await client.get("/v1/services")).json() == []
    listed = (await client.get("/v1/admin/services", headers=auth(editor))).json()
    assert [(s["slug"], s["status"]) for s in listed] == [("ai-integration", "draft")]


@pytest.mark.parametrize(
    "bad",
    [
        {"slug": "Not A Slug"},
        {"slug": "trailing-"},
        {"summary": "short"},
        {"status": "scheduled"},
        {"meta_title": "x" * 71},
        {"body": {"faqs": [{"question": "?", "answer": "a"}]}},
    ],
)
async def test_service_validation(client, editor, bad):
    res = await client.post("/v1/admin/services", headers=auth(editor), json={**SERVICE, **bad})
    assert res.status_code == 422


async def test_slugs_must_be_unique(client, editor):
    first = (await client.post("/v1/admin/services", headers=auth(editor), json=SERVICE)).json()["id"]
    dup = await client.post("/v1/admin/services", headers=auth(editor), json={**SERVICE, "title": "Other"})
    assert dup.status_code == 409

    other = (
        await client.post("/v1/admin/services", headers=auth(editor), json={**SERVICE, "slug": "seo-growth"})
    ).json()["id"]
    res = await client.put(f"/v1/admin/services/{other}", headers=auth(editor), json=SERVICE)
    assert res.status_code == 409
    # Keeping your own slug is fine.
    assert (
        await client.put(f"/v1/admin/services/{first}", headers=auth(editor), json=SERVICE)
    ).status_code == 200


async def test_published_services_must_be_unpublished_before_deleting(client, editor, session_factory):
    service_id = (await client.post("/v1/admin/services", headers=auth(editor), json=SERVICE)).json()["id"]
    assert (await client.delete(f"/v1/admin/services/{service_id}", headers=auth(editor))).status_code == 409

    await client.put(
        f"/v1/admin/services/{service_id}", headers=auth(editor), json={**SERVICE, "status": "draft"}
    )
    assert (await client.delete(f"/v1/admin/services/{service_id}", headers=auth(editor))).status_code == 204
    assert (await client.get(f"/v1/admin/services/{service_id}", headers=auth(editor))).status_code == 404
    assert [r.action for r in await audit_rows(session_factory)] == ["create", "update", "delete"]


# --- Case studies ------------------------------------------------------------------------------------


async def test_case_study_lifecycle_and_public_api(client, editor, session_factory, queued_revalidations):
    service_id = (await client.post("/v1/admin/services", headers=auth(editor), json=SERVICE)).json()["id"]

    res = await client.post(
        "/v1/admin/case-studies", headers=auth(editor), json={**CASE_STUDY, "service_ids": [service_id]}
    )
    assert res.status_code == 201, res.text
    created = res.json()
    # No client work yet, so case studies default to being labelled as demos.
    assert created["is_demo"] is True
    assert created["published_at"] is not None
    assert created["service_ids"] == [service_id]

    public = (await client.get("/v1/case-studies/ai-support-assistant")).json()
    assert public["is_demo"] is True
    assert public["services"] == [{"slug": "ai-integration", "title": "AI Integration"}]
    assert public["results"] == [{"metric": "62%", "label": "of questions answered without an agent"}]

    cards = (await client.get("/v1/case-studies", params={"service": "ai-integration"})).json()
    assert [c["slug"] for c in cards] == ["ai-support-assistant"]
    assert (await client.get("/v1/case-studies", params={"service": "seo-growth"})).json() == []

    detail = (await client.get("/v1/services/ai-integration")).json()
    assert [c["slug"] for c in detail["case_studies"]] == ["ai-support-assistant"]

    # Unlinking the service is recorded with the before and after ids.
    res = await client.put(f"/v1/admin/case-studies/{created['id']}", headers=auth(editor), json=CASE_STUDY)
    assert res.json()["service_ids"] == []
    rows = await audit_rows(session_factory)
    assert rows[-1].diff == {"service_ids": [[service_id], []]}
    assert queued_revalidations[-1] == {"case-studies"}


async def test_published_date_is_kept_when_republishing(client, editor):
    created = (await client.post("/v1/admin/case-studies", headers=auth(editor), json=CASE_STUDY)).json()
    first_published = created["published_at"]
    url = f"/v1/admin/case-studies/{created['id']}"
    await client.put(url, headers=auth(editor), json={**CASE_STUDY, "status": "draft"})
    assert (await client.get("/v1/case-studies/ai-support-assistant")).status_code == 404
    again = (await client.put(url, headers=auth(editor), json=CASE_STUDY)).json()
    assert again["published_at"] == first_published


async def test_case_study_validation(client, editor):
    for bad in (
        {"service_ids": [str(uuid.uuid4())]},
        {"live_url": "not a url"},
        {"results": [{"metric": "", "label": "x"}]},
        {"slug": "has spaces"},
    ):
        res = await client.post("/v1/admin/case-studies", headers=auth(editor), json={**CASE_STUDY, **bad})
        assert res.status_code == 422, bad
    assert (await client.get("/v1/admin/case-studies", headers=auth(editor))).json() == []


async def test_draft_services_are_not_linked_from_public_case_studies(client, editor):
    draft = (
        await client.post("/v1/admin/services", headers=auth(editor), json={**SERVICE, "status": "draft"})
    ).json()["id"]
    await client.post(
        "/v1/admin/case-studies", headers=auth(editor), json={**CASE_STUDY, "service_ids": [draft]}
    )
    assert (await client.get("/v1/case-studies/ai-support-assistant")).json()["services"] == []


async def test_featured_case_studies_come_first(client, editor):
    await client.post("/v1/admin/case-studies", headers=auth(editor), json=CASE_STUDY)
    await client.post(
        "/v1/admin/case-studies",
        headers=auth(editor),
        json={**CASE_STUDY, "slug": "booking-app", "title": "Booking app", "is_featured": True},
    )
    assert [c["slug"] for c in (await client.get("/v1/case-studies")).json()] == [
        "booking-app",
        "ai-support-assistant",
    ]
    featured = (await client.get("/v1/case-studies", params={"featured": True})).json()
    assert [c["slug"] for c in featured] == ["booking-app"]
