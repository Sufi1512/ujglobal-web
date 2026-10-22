"""Admin sign-in.

Login returns a short-lived JWT access token in the response body (the admin app keeps it in memory and
sends it as a Bearer header) and sets an opaque refresh token in an httpOnly cookie scoped to /v1/auth.
Each refresh rotates that token. Presenting an already-rotated token is treated as theft and signs the
user out everywhere.
"""

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy import select, update

from app.core.auth import CurrentUser
from app.core.client import client_ip, hash_ip
from app.core.config import get_settings
from app.core.db import SessionDep
from app.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    password_needs_rehash,
    verify_password,
)
from app.models import AuthSession, User
from app.schemas.auth import LoginIn, TokenOut, UserOut

REFRESH_COOKIE = "ujg_refresh"
REFRESH_COOKIE_PATH = "/v1/auth"
# Two tabs can refresh at the same moment; the loser of that race should not trigger a sign-out-everywhere.
REUSE_GRACE = timedelta(seconds=30)

router = APIRouter(prefix="/auth", tags=["auth"])


def require_csrf_header(x_requested_with: Annotated[str | None, Header()] = None) -> None:
    """Cookie-authenticated calls must send a custom header, which a cross-site form or link cannot add."""
    if x_requested_with != "ujglobal-admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing X-Requested-With header")


CsrfChecked = Depends(require_csrf_header)

_INVALID_LOGIN = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong email or password")
_INVALID_SESSION = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")


def _set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        max_age=settings.refresh_token_days * 86400,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
    )


def _clear_refresh_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        REFRESH_COOKIE,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
    )


async def _start_session(session: SessionDep, user: User, request: Request) -> str:
    token = new_refresh_token()
    session.add(
        AuthSession(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.now(UTC) + timedelta(days=get_settings().refresh_token_days),
            user_agent=(request.headers.get("user-agent") or "")[:255] or None,
            ip_hash=hash_ip(client_ip(request)),
        )
    )
    return token


def _token_response(user: User) -> TokenOut:
    access_token, expires_in = create_access_token(user.id, user.role.value)
    return TokenOut(access_token=access_token, expires_in=expires_in, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn, request: Request, response: Response, session: SessionDep) -> TokenOut:
    user = await session.scalar(select(User).where(User.email == str(payload.email).lower()))
    # verify_password still runs a full hash check when the user is missing, so timing doesn't leak emails.
    password_ok = verify_password(user.password_hash if user else None, payload.password)
    if user is None or not password_ok or not user.is_active:
        raise _INVALID_LOGIN

    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(payload.password)
    user.last_login_at = datetime.now(UTC)
    refresh_token = await _start_session(session, user, request)
    await session.commit()

    _set_refresh_cookie(response, refresh_token)
    return _token_response(user)


@router.post("/refresh", response_model=TokenOut, dependencies=[CsrfChecked])
async def refresh(
    request: Request,
    response: Response,
    session: SessionDep,
    refresh_cookie: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
) -> TokenOut:
    if not refresh_cookie:
        raise _INVALID_SESSION

    now = datetime.now(UTC)
    current = await session.scalar(
        select(AuthSession).where(AuthSession.token_hash == hash_token(refresh_cookie)).with_for_update()
    )
    if current is None:
        _clear_refresh_cookie(response)
        raise _INVALID_SESSION

    if current.revoked_at is not None:
        if now - current.revoked_at > REUSE_GRACE:
            # An old token came back: assume it was stolen and end every session for this user.
            await session.execute(
                update(AuthSession)
                .where(AuthSession.user_id == current.user_id, AuthSession.revoked_at.is_(None))
                .values(revoked_at=now)
            )
            await session.commit()
        raise _INVALID_SESSION

    user = await session.get(User, current.user_id)
    if current.expires_at <= now or user is None or not user.is_active:
        current.revoked_at = now
        await session.commit()
        raise _INVALID_SESSION

    current.revoked_at = now
    new_token = await _start_session(session, user, request)
    await session.commit()

    _set_refresh_cookie(response, new_token)
    return _token_response(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, dependencies=[CsrfChecked])
async def logout(
    response: Response,
    session: SessionDep,
    refresh_cookie: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
) -> Response:
    if refresh_cookie:
        await session.execute(
            update(AuthSession)
            .where(AuthSession.token_hash == hash_token(refresh_cookie), AuthSession.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )
        await session.commit()
    response.status_code = status.HTTP_204_NO_CONTENT
    _clear_refresh_cookie(response)
    return response


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> User:
    return user
