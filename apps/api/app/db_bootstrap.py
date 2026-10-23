"""Creates the site's database (and, with DATABASE_ADMIN_URL, its user) when they don't exist yet.

Run before migrations on every API start:

    python -m app.db_bootstrap && alembic upgrade head && gunicorn ...

It's safe to run again and again: when everything exists it only checks and exits. Two modes:

- DATABASE_ADMIN_URL set (an admin such as `postgres`): makes sure the user from DATABASE_URL exists
  with that password, then that the database exists and belongs to it.
- Only DATABASE_URL: connects as that user to the server's `postgres` database and creates the site's
  database if it's missing. The user needs permission to create databases (CREATEDB).
"""

import asyncio
import logging
import sys

import asyncpg
from pydantic import ValidationError
from sqlalchemy.engine import URL, make_url

from app.core.config import get_settings

log = logging.getLogger("app.db_bootstrap")

MAINTENANCE_DB = "postgres"
ATTEMPTS = 15  # the database server may still be starting: retry for about 30 seconds


def _connect_args(url: URL, database: str) -> dict[str, object]:
    args: dict[str, object] = {
        "host": url.host or "localhost",
        "port": url.port or 5432,
        "user": url.username,
        "password": url.password,
        "database": database,
    }
    ssl = url.query.get("ssl") or url.query.get("sslmode")
    if ssl:
        args["ssl"] = ssl if isinstance(ssl, str) else ssl[0]
    return args


def _ident(name: str) -> str:
    """Quotes an identifier for SQL (names come from settings, never from visitors)."""
    return '"' + name.replace('"', '""') + '"'


async def _connect(url: URL, database: str) -> asyncpg.Connection:
    last: Exception | None = None
    for attempt in range(1, ATTEMPTS + 1):
        try:
            return await asyncpg.connect(**_connect_args(url, database), timeout=5)  # type: ignore[arg-type]
        except (OSError, asyncpg.CannotConnectNowError, TimeoutError) as exc:
            last = exc
            log.info("Waiting for PostgreSQL at %s:%s (attempt %s)...", url.host, url.port or 5432, attempt)
            await asyncio.sleep(2)
    raise RuntimeError(f"Could not reach PostgreSQL at {url.host}:{url.port or 5432}: {last}")


async def ensure_database(database_url: str, admin_url: str | None = None) -> list[str]:
    """Creates whatever is missing and returns what it did (empty when all already existed)."""
    app_url = make_url(database_url)
    name, user = app_url.database, app_url.username
    if not name or not user:
        raise ValueError("DATABASE_URL must include a user and a database name")
    done: list[str] = []

    if admin_url:
        admin = make_url(admin_url)
        conn = await _connect(admin, admin.database or MAINTENANCE_DB)
        try:
            if not await conn.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", user):
                # Passwords can't be bound parameters in CREATE ROLE; quote it as a literal instead.
                password = "'" + (app_url.password or "").replace("'", "''") + "'"
                await conn.execute(f"CREATE ROLE {_ident(user)} LOGIN PASSWORD {password}")
                done.append(f"created user {user}")
            if not await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", name):
                await conn.execute(f"CREATE DATABASE {_ident(name)} OWNER {_ident(user)}")
                done.append(f"created database {name}")
        finally:
            await conn.close()
        return done

    try:
        conn = await _connect(app_url, MAINTENANCE_DB)
    except asyncpg.InvalidCatalogNameError:
        # No `postgres` database to connect to: check the target itself instead.
        conn = await _connect(app_url, name)
        await conn.close()
        return done
    try:
        if not await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", name):
            try:
                await conn.execute(f"CREATE DATABASE {_ident(name)}")
            except asyncpg.InsufficientPrivilegeError as exc:
                raise RuntimeError(
                    f"Database {name!r} doesn't exist and user {user!r} isn't allowed to create it. "
                    f"Either create it once (CREATE DATABASE {name} OWNER {user};), give the user "
                    "CREATEDB, or set DATABASE_ADMIN_URL to an admin connection."
                ) from exc
            done.append(f"created database {name}")
    finally:
        await conn.close()
    return done


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    try:
        settings = get_settings()
    except ValidationError as exc:
        # e.g. no DATABASE_URL: print the plain reason, not a stack trace.
        for error in exc.errors():
            log.error("%s", str(error["msg"]).removeprefix("Value error, "))
        sys.exit(1)
    try:
        done = asyncio.run(ensure_database(settings.database_url, settings.database_admin_url))
    except Exception as exc:
        log.error("%s", exc)
        sys.exit(1)
    log.info("Database ready%s", f" ({'; '.join(done)})" if done else "")


if __name__ == "__main__":
    main()
