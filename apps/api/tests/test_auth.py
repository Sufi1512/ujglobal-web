from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.cli import create_user
from app.core.auth import require_roles
from app.core.config import get_settings
from app.core.security import JWT_ALGORITHM, JWT_ISSUER, hash_password, verify_password
from app.models import AuthSession, User, UserRole
from app.routers.auth import REFRESH_COOKIE

PASSWORD = "correct horse battery staple"
CSRF = {"X-Requested-With": "ujglobal-admin"}


@pytest.fixture
async def owner(session_factory) -> User:
    async with session_factory() as session:
        user = User(
            email="owner@ujglobal.tech",
            name="Owner",
            role=UserRole.owner,
            password_hash=hash_password(PASSWORD),
        )
        session.add(user)
        await session.commit()
        return user


async def login(client, email="owner@ujglobal.tech", password=PASSWORD):
    return await client.post("/v1/auth/login", json={"email": email, "password": password})


async def refresh_with(client, refresh_token: str):
    """Refresh with a specific token, as an attacker replaying a copied cookie would."""
    return await client.post(
        "/v1/auth/refresh", headers={**CSRF, "Cookie": f"{REFRESH_COOKIE}={refresh_token}"}
    )


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def sessions_for(session_factory, user: User) -> list[AuthSession]:
    async with session_factory() as session:
        result = await session.scalars(
            select(AuthSession).where(AuthSession.user_id == user.id).order_by(AuthSession.created_at)
        )
        return list(result)


def test_password_hashing_uses_argon2():
    hashed = hash_password(PASSWORD)
    assert hashed.startswith("$argon2id$")
    assert verify_password(hashed, PASSWORD)
    assert not verify_password(hashed, "wrong password")
    assert not verify_password(None, PASSWORD)
    assert not verify_password("not-a-hash", PASSWORD)


async def test_login_returns_token_and_sets_refresh_cookie(client, owner, session_factory):
    res = await login(client, email="OWNER@ujglobal.tech")
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == get_settings().access_token_minutes * 60
    assert body["user"]["email"] == "owner@ujglobal.tech"
    assert "password_hash" not in body["user"]

    cookie = res.headers["set-cookie"]
    assert cookie.startswith(f"{REFRESH_COOKIE}=")
    for attribute in ("HttpOnly", "Secure", "SameSite=strict", "Path=/v1/auth"):
        assert attribute.lower() in cookie.lower()

    me = await client.get("/v1/auth/me", headers=bearer(body["access_token"]))
    assert me.status_code == 200
    assert me.json()["role"] == "owner"

    [stored] = await sessions_for(session_factory, owner)
    assert stored.token_hash != client.cookies[REFRESH_COOKIE]
    assert stored.revoked_at is None


@pytest.mark.parametrize(
    ("email", "password"),
    [("owner@ujglobal.tech", "wrong password"), ("nobody@ujglobal.tech", PASSWORD)],
)
async def test_login_rejects_bad_credentials_with_one_message(client, owner, email, password):
    res = await login(client, email=email, password=password)
    assert res.status_code == 401
    assert res.json()["detail"] == "Wrong email or password"
    assert REFRESH_COOKIE not in client.cookies


async def test_inactive_user_cannot_log_in_or_use_old_token(client, owner, session_factory):
    token = (await login(client)).json()["access_token"]
    async with session_factory() as session:
        user = await session.get(User, owner.id)
        user.is_active = False
        await session.commit()

    assert (await client.get("/v1/auth/me", headers=bearer(token))).status_code == 401
    assert (await login(client)).status_code == 401


async def test_me_rejects_missing_tampered_and_expired_tokens(client, owner):
    assert (await client.get("/v1/auth/me")).status_code == 401
    assert (await client.get("/v1/auth/me", headers=bearer("not.a.jwt"))).status_code == 401

    now = datetime.now(UTC)
    claims = {"sub": str(owner.id), "type": "access", "iss": JWT_ISSUER, "iat": now}
    expired = jwt.encode(
        {**claims, "exp": now - timedelta(seconds=1)}, get_settings().jwt_secret, algorithm=JWT_ALGORITHM
    )
    forged = jwt.encode({**claims, "exp": now + timedelta(minutes=5)}, "x" * 40, algorithm=JWT_ALGORITHM)
    for token in (expired, forged):
        assert (await client.get("/v1/auth/me", headers=bearer(token))).status_code == 401


async def test_refresh_needs_the_csrf_header(client, owner):
    await login(client)
    res = await client.post("/v1/auth/refresh")
    assert res.status_code == 403


async def test_refresh_rotates_the_session(client, owner, session_factory):
    await login(client)
    first_cookie = client.cookies[REFRESH_COOKIE]

    res = await client.post("/v1/auth/refresh", headers=CSRF)
    assert res.status_code == 200
    assert (await client.get("/v1/auth/me", headers=bearer(res.json()["access_token"]))).status_code == 200
    assert client.cookies[REFRESH_COOKIE] != first_cookie

    old, new = await sessions_for(session_factory, owner)
    assert old.revoked_at is not None
    assert new.revoked_at is None


async def test_reusing_a_rotated_token_signs_out_everywhere(client, owner, session_factory):
    await login(client)
    stolen = client.cookies[REFRESH_COOKIE]
    assert (await client.post("/v1/auth/refresh", headers=CSRF)).status_code == 200

    # Move the rotation outside the grace window, as if the old token came back much later.
    async with session_factory() as session:
        old = await session.scalar(select(AuthSession).where(AuthSession.revoked_at.is_not(None)))
        old.revoked_at = datetime.now(UTC) - timedelta(minutes=5)
        await session.commit()

    client.cookies.clear()
    assert (await refresh_with(client, stolen)).status_code == 401
    assert all(s.revoked_at is not None for s in await sessions_for(session_factory, owner))


async def test_parallel_refresh_inside_grace_window_keeps_the_new_session(client, owner, session_factory):
    await login(client)
    old_cookie = client.cookies[REFRESH_COOKIE]
    assert (await client.post("/v1/auth/refresh", headers=CSRF)).status_code == 200

    client.cookies.clear()
    assert (await refresh_with(client, old_cookie)).status_code == 401
    _, new = await sessions_for(session_factory, owner)
    assert new.revoked_at is None


async def test_expired_refresh_token_is_rejected(client, owner, session_factory):
    await login(client)
    async with session_factory() as session:
        stored = await session.scalar(select(AuthSession))
        stored.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        await session.commit()
    assert (await client.post("/v1/auth/refresh", headers=CSRF)).status_code == 401


async def test_logout_revokes_session_and_clears_cookie(client, owner, session_factory):
    await login(client)
    cookie = client.cookies[REFRESH_COOKIE]

    res = await client.post("/v1/auth/logout", headers=CSRF)
    assert res.status_code == 204
    assert REFRESH_COOKIE not in client.cookies
    [stored] = await sessions_for(session_factory, owner)
    assert stored.revoked_at is not None

    assert (await refresh_with(client, cookie)).status_code == 401


async def test_require_roles_allows_owner_and_listed_roles_only():
    sales_only = require_roles(UserRole.sales)
    for role in (UserRole.owner, UserRole.sales):
        user = User(email="a@b.c", name="A", role=role, password_hash="x")
        assert await sales_only(user) is user

    with pytest.raises(HTTPException) as exc:
        await sales_only(User(email="e@b.c", name="E", role=UserRole.editor, password_hash="x"))
    assert exc.value.status_code == 403


async def test_cli_creates_a_user_that_can_log_in(client, monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", PASSWORD)
    await create_user("new@ujglobal.tech", "New Owner", UserRole.owner)
    assert (await login(client, email="new@ujglobal.tech")).status_code == 200

    with pytest.raises(SystemExit):
        await create_user("new@ujglobal.tech", "Again", UserRole.owner)


async def test_cli_rejects_short_passwords(monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", "short")
    with pytest.raises(SystemExit):
        await create_user("short@ujglobal.tech", "Short", UserRole.editor)
