import httpx
import pytest
from arq import Retry

from app.core.config import get_settings
from app.workers import tasks
from app.workers.tasks import revalidate_web


@pytest.fixture
def web(monkeypatch):
    """A fake Next.js /api/revalidate endpoint."""
    calls: list[httpx.Request] = []
    state = {"status": 200}

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(state["status"], json={"ok": True})

    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        tasks.httpx, "AsyncClient", lambda **kw: real_client(transport=httpx.MockTransport(handler), **kw)
    )
    settings = get_settings()
    monkeypatch.setattr(settings, "web_revalidate_url", "http://web:3000/api/revalidate")
    monkeypatch.setattr(settings, "revalidate_secret", "shared-secret")
    return calls, state


async def test_refresh_sends_known_tags_with_the_secret(web):
    calls, _ = web
    assert await revalidate_web({"job_try": 1}, ["services", "case-studies", "unknown"]) == (
        "refreshed case-studies, services"
    )
    [request] = calls
    assert str(request.url) == "http://web:3000/api/revalidate"
    assert request.headers["X-Revalidate-Secret"] == "shared-secret"
    assert request.read() == b'{"tags":["case-studies","services"]}'


async def test_refresh_retries_when_the_site_is_down(web):
    _, state = web
    state["status"] = 502
    with pytest.raises(Retry) as exc:
        await revalidate_web({"job_try": 2}, ["services"])
    assert exc.value.defer_score == 120 * 1000


async def test_refresh_can_be_switched_off(web, monkeypatch):
    calls, _ = web
    monkeypatch.setattr(get_settings(), "web_revalidate_url", None)
    assert await revalidate_web({"job_try": 1}, ["services"]) == "disabled"
    assert await revalidate_web({"job_try": 1}, []) == "disabled"
    assert calls == []
