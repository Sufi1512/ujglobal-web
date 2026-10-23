"""Fixed-window rate limits kept in Redis, so they hold across API workers and restarts.

Used to slow down password guessing and form flooding. Identifiers (emails, IP addresses) are hashed
before they become Redis keys, so Redis never holds them in readable form.

If Redis is unreachable the limit is skipped and an error is logged: an outage of the limiter must not
take sign-in or the contact form down with it. Cloudflare's rate-limiting rule is the second line.
"""

import hashlib
import logging
import math
import time
from dataclasses import dataclass
from typing import Protocol

import redis.asyncio as aioredis

from app.core.config import get_settings

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Decision:
    allowed: bool
    count: int
    retry_after: int  # seconds until the window resets (0 when allowed)


class Backend(Protocol):
    async def hit(self, key: str, window: int) -> tuple[int, int]: ...
    async def peek(self, key: str) -> tuple[int, int]: ...
    async def reset(self, key: str) -> None: ...


class RedisBackend:
    def __init__(self, url: str) -> None:
        self._redis = aioredis.from_url(url, socket_connect_timeout=1, socket_timeout=1)

    async def hit(self, key: str, window: int) -> tuple[int, int]:
        async with self._redis.pipeline(transaction=True) as pipe:
            pipe.incr(key)
            pipe.expire(key, window, nx=True)
            pipe.ttl(key)
            count, _, ttl = await pipe.execute()
        return int(count), max(int(ttl), 0)

    async def peek(self, key: str) -> tuple[int, int]:
        async with self._redis.pipeline(transaction=False) as pipe:
            pipe.get(key)
            pipe.ttl(key)
            value, ttl = await pipe.execute()
        return int(value or 0), max(int(ttl), 0)

    async def reset(self, key: str) -> None:
        await self._redis.delete(key)

    async def close(self) -> None:
        await self._redis.aclose()


class MemoryBackend:
    """For tests and local runs without Redis. Not shared between processes."""

    def __init__(self) -> None:
        self._data: dict[str, tuple[int, float]] = {}

    def _live(self, key: str) -> tuple[int, float] | None:
        entry = self._data.get(key)
        if entry and entry[1] <= time.monotonic():
            del self._data[key]
            return None
        return entry

    async def hit(self, key: str, window: int) -> tuple[int, int]:
        entry = self._live(key)
        count, expires = (entry[0] + 1, entry[1]) if entry else (1, time.monotonic() + window)
        self._data[key] = (count, expires)
        return count, math.ceil(expires - time.monotonic())

    async def peek(self, key: str) -> tuple[int, int]:
        entry = self._live(key)
        return (entry[0], math.ceil(entry[1] - time.monotonic())) if entry else (0, 0)

    async def reset(self, key: str) -> None:
        self._data.pop(key, None)


_backend: Backend | None = None


def backend() -> Backend:
    global _backend
    if _backend is None:
        _backend = RedisBackend(get_settings().redis_url)
    return _backend


def use_backend(new: Backend | None) -> None:
    """Swap the backend (tests use MemoryBackend)."""
    global _backend
    _backend = new


async def close() -> None:
    global _backend
    if isinstance(_backend, RedisBackend):
        await _backend.close()
    _backend = None


def _key(name: str, identifier: str) -> str:
    digest = hashlib.sha256(f"{get_settings().ip_hash_salt}:{identifier}".encode()).hexdigest()[:32]
    return f"rl:{name}:{digest}"


async def hit(name: str, identifier: str | None, limit: int, window: int) -> Decision:
    """Counts one event. Allowed while the count in the current window is at most `limit`."""
    if not identifier or limit <= 0:
        return Decision(True, 0, 0)
    try:
        count, ttl = await backend().hit(_key(name, identifier), window)
    except Exception:
        log.exception("Rate limiter unavailable; allowing %s", name)
        return Decision(True, 0, 0)
    return Decision(count <= limit, count, 0 if count <= limit else max(ttl, 1))


async def check(name: str, identifier: str | None, limit: int) -> Decision:
    """Reports whether the limit is already used up, without counting anything."""
    if not identifier or limit <= 0:
        return Decision(True, 0, 0)
    try:
        count, ttl = await backend().peek(_key(name, identifier))
    except Exception:
        log.exception("Rate limiter unavailable; allowing %s", name)
        return Decision(True, 0, 0)
    return Decision(count < limit, count, 0 if count < limit else max(ttl, 1))


async def reset(name: str, identifier: str | None) -> None:
    if not identifier:
        return
    try:
        await backend().reset(_key(name, identifier))
    except Exception:
        log.exception("Rate limiter unavailable; could not reset %s", name)


def retry_message(seconds: int) -> str:
    minutes = max(1, math.ceil(seconds / 60))
    return f"Too many attempts. Please try again in {minutes} minute{'s' if minutes != 1 else ''}."
