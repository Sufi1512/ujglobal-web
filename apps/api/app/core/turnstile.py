"""Cloudflare Turnstile: checks the token the contact form gets from Cloudflare's "are you human" widget."""

import logging

import httpx

from app.core.config import get_settings

log = logging.getLogger(__name__)

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify(token: str | None, ip: str | None) -> bool:
    """True when Turnstile is off, or Cloudflare confirms the token. Fails closed if Cloudflare can't be
    reached, so a bot can't get through by timing a submission with an outage."""
    secret = get_settings().turnstile_secret
    if not secret:
        return True
    if not token:
        return False
    data = {"secret": secret, "response": token}
    if ip:
        data["remoteip"] = ip
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            res = await client.post(VERIFY_URL, data=data)
        return bool(res.json().get("success"))
    except Exception:
        log.exception("Turnstile verification failed")
        return False
