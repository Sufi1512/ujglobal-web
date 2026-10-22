import hashlib

from fastapi import Request

from app.core.config import get_settings


def client_ip(request: Request) -> str | None:
    # Cloudflare sets cf-connecting-ip to the visitor's real address.
    return request.headers.get("cf-connecting-ip") or (request.client.host if request.client else None)


def hash_ip(ip: str | None) -> str | None:
    """IPs are only ever stored as a salted hash."""
    if not ip:
        return None
    return hashlib.sha256(f"{get_settings().ip_hash_salt}:{ip}".encode()).hexdigest()
