"""Admin sign-in.

Login returns a short-lived JWT access token in the response body (the admin app keeps it in memory and
sends it as a Bearer header) and sets an opaque refresh token in an httpOnly cookie scoped to /v1/auth.
Each refresh rotates that token. Presenting an already-rotated token is treated as theft and signs the
user out everywhere.

Accounts with two-factor sign-in get a short-lived challenge token instead, and only get a session from
/v1/auth/mfa/verify with a correct authenticator or backup code. Failed passwords and codes are counted
per account and per IP address; past the limit, sign-in answers 429 until the window passes, and the
owners are emailed once.
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy import select, update

from app.core import audit, mfa, ratelimit
from app.core.auth import CurrentUser
from app.core.client import client_ip, hash_ip
from app.core.config import get_settings
from app.core.db import SessionDep
from app.core.security import (
    create_access_token,
    create_mfa_token,
    decode_mfa_token,
    hash_password,
    hash_token,
    new_refresh_token,
    password_needs_rehash,
    verify_password,
)
from app.models import AuthSession, User
from app.schemas.auth import (
    BackupCodesOut,
    LoginIn,
    MfaChallenge,
    MfaCodeIn,
    MfaSetupOut,
    MfaVerifyIn,
    TokenOut,
    UserOut,
)
from app.workers.queue import queue_security_alert

log = logging.getLogger("app.security")

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
_INVALID_CODE = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="That code didn't work")

# Rate-limit buckets. Failures are counted, successes are free (and clear the account's count).
LOGIN_FAIL_ACCOUNT = "login-fail-account"
LOGIN_FAIL_IP = "login-fail-ip"
MFA_FAIL_USER = "mfa-fail-user"
MFA_MAX_FAILURES = 5


def _too_many(decision: ratelimit.Decision) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=ratelimit.retry_message(decision.retry_after),
        headers={"Retry-After": str(decision.retry_after)},
    )


async def _record_failure(bucket: str, identifier: str, limit: int, kind: str, request: Request) -> None:
    """Counts a failed attempt, logs it, and emails the owners the moment an account or IP gets locked."""
    settings = get_settings()
    decision = await ratelimit.hit(bucket, identifier, limit, settings.login_window_seconds)
    ip_hash = hash_ip(client_ip(request)) or "unknown"
    log.warning("Failed %s (%s) from ip_hash=%s, count=%s", kind, bucket, ip_hash[:12], decision.count)
    if decision.count == limit:
        log.error(
            "Sign-in locked for %ss after %s failures (%s)", settings.login_window_seconds, limit, bucket
        )
        await queue_security_alert(
            "signin_locked",
            {
                "what": kind,
                "bucket": bucket,
                "account": identifier if bucket in (LOGIN_FAIL_ACCOUNT, MFA_FAIL_USER) else "",
                "ip_hash": ip_hash[:12],
                "failures": str(limit),
                "minutes": str(settings.login_window_seconds // 60),
            },
        )


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


@router.post("/login", response_model=TokenOut | MfaChallenge)
async def login(
    payload: LoginIn, request: Request, response: Response, session: SessionDep
) -> TokenOut | MfaChallenge:
    settings = get_settings()
    email = str(payload.email).lower()
    ip = client_ip(request)

    # Checked before the password, so a locked account or IP can't keep guessing.
    for bucket, identifier, limit in (
        (LOGIN_FAIL_ACCOUNT, email, settings.login_max_failures_per_account),
        (LOGIN_FAIL_IP, ip, settings.login_max_failures_per_ip),
    ):
        decision = await ratelimit.check(bucket, identifier, limit)
        if not decision.allowed:
            raise _too_many(decision)

    user = await session.scalar(select(User).where(User.email == email))
    # verify_password still runs a full hash check when the user is missing, so timing doesn't leak emails.
    password_ok = verify_password(user.password_hash if user else None, payload.password)
    if user is None or not password_ok or not user.is_active:
        await _record_failure(
            LOGIN_FAIL_ACCOUNT, email, settings.login_max_failures_per_account, "password", request
        )
        if ip:
            await _record_failure(LOGIN_FAIL_IP, ip, settings.login_max_failures_per_ip, "password", request)
        raise _INVALID_LOGIN

    await ratelimit.reset(LOGIN_FAIL_ACCOUNT, email)
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(payload.password)

    if user.mfa_enabled:
        await session.commit()
        return MfaChallenge(mfa_token=create_mfa_token(user.id))

    return await _sign_in(session, user, request, response)


async def _sign_in(session: SessionDep, user: User, request: Request, response: Response) -> TokenOut:
    user.last_login_at = datetime.now(UTC)
    refresh_token = await _start_session(session, user, request)
    await session.commit()
    _set_refresh_cookie(response, refresh_token)
    return _token_response(user)


@router.post("/mfa/verify", response_model=TokenOut)
async def verify_mfa(
    payload: MfaVerifyIn, request: Request, response: Response, session: SessionDep
) -> TokenOut:
    """Second step of sign-in: the challenge token from /login plus an authenticator or backup code."""
    user_id = decode_mfa_token(payload.mfa_token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign-in expired, please start again"
        )
    key = str(user_id)
    decision = await ratelimit.check(MFA_FAIL_USER, key, MFA_MAX_FAILURES)
    if not decision.allowed:
        raise _too_many(decision)

    user = await session.scalar(select(User).where(User.id == user_id).with_for_update())
    if user is None or not user.is_active or not user.mfa_enabled or not user.totp_secret_enc:
        raise _INVALID_SESSION

    if not _accept_code(user, payload.code):
        await session.rollback()
        await _record_failure(MFA_FAIL_USER, key, MFA_MAX_FAILURES, "two-factor code", request)
        raise _INVALID_CODE
    await ratelimit.reset(MFA_FAIL_USER, key)
    return await _sign_in(session, user, request, response)


def _accept_code(user: User, code: str) -> bool:
    """Checks an authenticator code (once per time step) or uses up a backup code."""
    secret = mfa.decrypt_secret(user.totp_secret_enc or "")
    if secret:
        step = mfa.verify_totp(secret, code, user.totp_last_step)
        if step is not None:
            user.totp_last_step = step
            return True
    remaining = mfa.use_backup_code(list(user.backup_code_hashes or []), code)
    if remaining is not None:
        user.backup_code_hashes = remaining
        return True
    return False


@router.post("/mfa/setup", response_model=MfaSetupOut)
async def start_mfa_setup(user: CurrentUser, session: SessionDep) -> MfaSetupOut:
    """Creates a new authenticator secret for the signed-in user. It only takes effect after /mfa/enable."""
    if user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Two-factor sign-in is already on")
    secret = mfa.new_secret()
    user.totp_secret_enc = mfa.encrypt_secret(secret)
    user.totp_last_step = None
    await session.commit()
    uri = mfa.provisioning_uri(secret, user.email)
    return MfaSetupOut(secret=secret, otpauth_uri=uri, qr_data_uri=mfa.qr_data_uri(uri))


@router.post("/mfa/enable", response_model=BackupCodesOut)
async def enable_mfa(
    payload: MfaCodeIn, request: Request, user: CurrentUser, session: SessionDep
) -> BackupCodesOut:
    """Turns two-factor sign-in on once the user proves their app works, and returns backup codes once."""
    if user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Two-factor sign-in is already on")
    key = str(user.id)
    decision = await ratelimit.check(MFA_FAIL_USER, key, MFA_MAX_FAILURES)
    if not decision.allowed:
        raise _too_many(decision)
    secret = mfa.decrypt_secret(user.totp_secret_enc or "")
    step = mfa.verify_totp(secret, payload.code, None) if secret else None
    if step is None:
        await _record_failure(MFA_FAIL_USER, key, MFA_MAX_FAILURES, "two-factor setup code", request)
        raise _INVALID_CODE
    codes = mfa.new_backup_codes()
    user.totp_last_step = step
    user.totp_enabled_at = datetime.now(UTC)
    user.backup_code_hashes = [mfa.hash_backup_code(c) for c in codes]
    audit.record(session, user, "mfa.enable", "user", user.id, {"mfa_enabled": [False, True]})
    await session.commit()
    await ratelimit.reset(MFA_FAIL_USER, key)
    return BackupCodesOut(backup_codes=codes)


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
