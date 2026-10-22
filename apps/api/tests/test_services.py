from app.models import Service
from app.models.content import PublishStatus


async def test_lists_only_published_services_in_order(client, session_factory):
    async with session_factory() as session:
        session.add_all(
            [
                Service(
                    slug="seo-growth", title="SEO", summary="s", sort_order=2, status=PublishStatus.published
                ),
                Service(
                    slug="web-development",
                    title="Web",
                    summary="w",
                    sort_order=1,
                    status=PublishStatus.published,
                ),
                Service(slug="hidden", title="Draft", summary="d", status=PublishStatus.draft),
            ]
        )
        await session.commit()

    res = await client.get("/v1/services")
    assert res.status_code == 200
    assert [s["slug"] for s in res.json()] == ["web-development", "seo-growth"]

    assert (await client.get("/v1/services/hidden")).status_code == 404
    assert (await client.get("/v1/services/seo-growth")).json()["title"] == "SEO"
