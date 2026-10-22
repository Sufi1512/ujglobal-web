from sqlalchemy import select

from app.models import Lead, LeadSource, LeadStatus

VALID = {
    "name": "Ada Lovelace",
    "email": "Ada@Example.com",
    "company": "Analytical Engines",
    "message": "We need an AI assistant for our support team.",
    "landing_page": "/contact",
}


async def test_contact_stores_lead(client, session_factory):
    res = await client.post("/v1/leads/contact", json=VALID, headers={"cf-connecting-ip": "203.0.113.7"})
    assert res.status_code == 201
    body = res.json()
    assert body["ok"] is True and body["id"]

    async with session_factory() as session:
        lead = await session.scalar(select(Lead))
    assert lead is not None
    assert lead.email == "ada@example.com"
    assert lead.source == LeadSource.contact
    assert lead.status == LeadStatus.new
    assert lead.ip_hash and "203.0.113.7" not in lead.ip_hash


async def test_contact_honeypot_is_not_stored(client, session_factory):
    res = await client.post("/v1/leads/contact", json={**VALID, "website": "spam.example"})
    assert res.status_code == 201
    assert res.json()["id"] is None

    async with session_factory() as session:
        assert await session.scalar(select(Lead)) is None


async def test_contact_rejects_invalid_input(client):
    res = await client.post("/v1/leads/contact", json={**VALID, "email": "not-an-email", "message": "hi"})
    assert res.status_code == 422
