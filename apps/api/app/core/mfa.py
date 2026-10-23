"""Two-factor sign-in with authenticator apps (TOTP, RFC 6238) and one-time backup codes."""

import base64
import hashlib
import secrets
import time

import pyotp
import segno
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings

ISSUER = "UJ Global"
STEP_SECONDS = 30
BACKUP_CODE_COUNT = 10


def _fernet() -> Fernet:
    # A Fernet key is 32 bytes, url-safe base64. Derive it from the configured secret.
    digest = hashlib.sha256(f"ujglobal-mfa:{get_settings().mfa_encryption_key}".encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(secret: str) -> str:
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_secret(token: str) -> str | None:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return None


def new_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, email: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=ISSUER)


def qr_data_uri(uri: str) -> str:
    """The setup link as an SVG QR code in a data: URI, shown as an image for the app to scan."""
    return segno.make(uri, error="m").svg_data_uri(scale=5, border=2, dark="#10201c", light="#ffffff")


def verify_totp(secret: str, code: str, last_step: int | None, now: float | None = None) -> int | None:
    """Returns the accepted time step, or None. Allows one step of clock drift either way and never
    accepts a step at or before `last_step`, so a code that was already used can't be replayed."""
    digits = "".join(ch for ch in code if ch.isdigit())
    if len(digits) != 6:
        return None
    totp = pyotp.TOTP(secret)
    current = int((now if now is not None else time.time()) // STEP_SECONDS)
    for step in (current - 1, current, current + 1):
        if last_step is not None and step <= last_step:
            continue
        if secrets.compare_digest(totp.at(step * STEP_SECONDS), digits):
            return step
    return None


def _normalise_backup(code: str) -> str:
    return "".join(ch for ch in code.lower() if ch.isalnum())


def hash_backup_code(code: str) -> str:
    return hashlib.sha256(_normalise_backup(code).encode()).hexdigest()


def new_backup_codes() -> list[str]:
    """Ten codes like `k7m2-x9qp`: 40 bits each, plenty for a single-use code behind a rate limit."""
    alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
    codes = []
    for _ in range(BACKUP_CODE_COUNT):
        raw = "".join(secrets.choice(alphabet) for _ in range(8))
        codes.append(f"{raw[:4]}-{raw[4:]}")
    return codes


def use_backup_code(hashes: list[str], code: str) -> list[str] | None:
    """Returns the remaining hashes if `code` matched one (which is then used up), else None."""
    given = hash_backup_code(code)
    for stored in hashes:
        if secrets.compare_digest(stored, given):
            return [h for h in hashes if h != stored]
    return None
