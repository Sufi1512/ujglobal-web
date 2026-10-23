import hashlib

from fastapi import Request

from app.core.config import get_settings


def client_ip(request: Request) -> str | None:
    """The visitor's address, from the header the edge proxy sets (see Settings.client_ip_header).

    Headers a visitor can send themselves, such as CF-Connecting-IP or X-Forwarded-For, are never read
    here: Caddy checks those against Cloudflare's address ranges and passes on the verified result.
    """
    header = get_settings().client_ip_header
    forwarded = request.headers.get(header) if header else None
    if forwarded:
        return forwarded.strip()[:64]
    return request.client.host if request.client else None


def hash_ip(ip: str | None) -> str | None:
    """IPs are only ever stored as a salted hash."""
    if not ip:
        return None
    return hashlib.sha256(f"{get_settings().ip_hash_salt}:{ip}".encode()).hexdigest()
