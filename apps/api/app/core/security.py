"""Password hashing and token helpers for admin auth."""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import get_settings

JWT_ALGORITHM = "HS256"
JWT_ISSUER = "ujglobal-api"

_hasher = PasswordHasher()
# Verified against when the email is unknown, so a login takes the same time either way.
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(16))


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def create_access_token(user_id: uuid.UUID, role: str) -> tuple[str, int]:
    """Returns the signed token and its lifetime in seconds."""
    settings = get_settings()
    now = datetime.now(UTC)
    lifetime = timedelta(minutes=settings.access_token_minutes)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "iss": JWT_ISSUER,
        "iat": now,
        "exp": now + lifetime,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)
    return token, int(lifetime.total_seconds())


def decode_access_token(token: str) -> uuid.UUID | None:
    """Returns the user id for a valid, unexpired access token, otherwise None."""
    try:
        payload = jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            options={"require": ["sub", "exp", "iat", "iss"]},
        )
        if payload.get("type") != "access":
            return None
        return uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError):
        return None


MFA_TOKEN_MINUTES = 5


def create_mfa_token(user_id: uuid.UUID) -> str:
    """Proof that the password was right, valid for a few minutes, exchanged for a session only together
    with a correct authenticator or backup code. It grants no access on its own."""
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "type": "mfa",
        "iss": JWT_ISSUER,
        "iat": now,
        "exp": now + timedelta(minutes=MFA_TOKEN_MINUTES),
    }
    return jwt.encode(payload, get_settings().jwt_secret, algorithm=JWT_ALGORITHM)


def decode_mfa_token(token: str) -> uuid.UUID | None:
    try:
        payload = jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            options={"require": ["sub", "exp", "iat", "iss"]},
        )
        if payload.get("type") != "mfa":
            return None
        return uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError):
        return None


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    """Refresh tokens are stored only as a SHA-256 hash, so a database leak exposes no live sessions."""
    return hashlib.sha256(token.encode()).hexdigest()
