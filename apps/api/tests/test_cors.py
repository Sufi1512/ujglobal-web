import pytest

from app.core.config import get_settings

ORIGIN = get_settings().cors_origins[0]


@pytest.mark.parametrize("method", ["GET", "POST", "PUT", "PATCH", "DELETE"])
async def test_browser_preflight_allows_every_method_the_admin_uses(client, method):
    """The admin (site domain) calls the API on its own domain, so browsers send a preflight first."""
    res = await client.options(
        "/v1/admin/services/00000000-0000-0000-0000-000000000000",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert res.status_code == 200, res.text
    assert method in res.headers["access-control-allow-methods"]
    assert res.headers["access-control-allow-origin"] == ORIGIN
    assert res.headers["access-control-allow-credentials"] == "true"


async def test_other_origins_are_refused(client):
    res = await client.options(
        "/v1/admin/services",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert res.status_code == 400
    assert "access-control-allow-origin" not in res.headers
