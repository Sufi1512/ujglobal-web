"""The API creates its database (and user, with an admin connection) when they're missing."""

import uuid

import asyncpg
import pytest
from sqlalchemy.engine import make_url

from app.core.config import get_settings
from app.db_bootstrap import ensure_database


def _admin_url() -> str:
    # The test database's own connection is an admin (postgres) in CI and locally.
    return get_settings().database_url.rsplit("/", 1)[0] + "/postgres"


async def _admin():
    url = make_url(_admin_url())
    return await asyncpg.connect(
        host=url.host, port=url.port or 5432, user=url.username, password=url.password, database="postgres"
    )


async def test_creates_a_missing_database_and_is_idempotent():
    name = f"ujg_boot_{uuid.uuid4().hex[:8]}"
    url = get_settings().database_url.rsplit("/", 1)[0] + f"/{name}"
    conn = await _admin()
    try:
        assert await ensure_database(url) == [f"created database {name}"]
        assert await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", name) == 1
        assert await ensure_database(url) == []  # second run: nothing to do
    finally:
        await conn.execute(f'DROP DATABASE IF EXISTS "{name}"')
        await conn.close()


async def test_admin_url_also_creates_the_user():
    suffix = uuid.uuid4().hex[:8]
    user, name, password = f"ujg_user_{suffix}", f"ujg_db_{suffix}", "it's a secret"
    base = make_url(_admin_url())
    app_url = base.set(username=user, password=password, database=name).render_as_string(hide_password=False)
    conn = await _admin()
    try:
        done = await ensure_database(app_url, admin_url=_admin_url())
        assert done == [f"created user {user}", f"created database {name}"]
        owner = await conn.fetchval(
            "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = $1", name
        )
        assert owner == user
        # The new user can sign in with the password from DATABASE_URL (quotes included).
        app = await asyncpg.connect(
            host=base.host, port=base.port or 5432, user=user, password=password, database=name
        )
        await app.close()
        assert await ensure_database(app_url, admin_url=_admin_url()) == []
    finally:
        await conn.execute(f'DROP DATABASE IF EXISTS "{name}"')
        await conn.execute(f'DROP ROLE IF EXISTS "{user}"')
        await conn.close()


async def test_clear_message_when_the_user_cannot_create_databases():
    suffix = uuid.uuid4().hex[:8]
    user, name = f"ujg_nocreate_{suffix}", f"ujg_db_{suffix}"
    conn = await _admin()
    await conn.execute(f"CREATE ROLE \"{user}\" LOGIN PASSWORD 'pw'")
    base = make_url(_admin_url())
    url = base.set(username=user, password="pw", database=name).render_as_string(hide_password=False)
    try:
        with pytest.raises(RuntimeError, match="isn't allowed to create it"):
            await ensure_database(url)
    finally:
        await conn.execute(f'DROP ROLE IF EXISTS "{user}"')
        await conn.close()
