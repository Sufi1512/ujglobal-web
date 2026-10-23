"""Admin account management from the server shell. There is no public sign-up.

    python -m app.cli create-user --email you@ujglobal.tech --name "Your Name" --role owner
    python -m app.cli set-password --email you@ujglobal.tech
    python -m app.cli deactivate --email someone@ujglobal.tech
    python -m app.cli reset-mfa --email someone@ujglobal.tech    (lost phone: they set it up again)

Passwords are read from a hidden prompt, or from the ADMIN_PASSWORD environment variable for scripted setups.
"""

import argparse
import asyncio
import getpass
import os
import sys
from datetime import UTC, datetime

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import SessionLocal, engine
from app.core.security import hash_password
from app.models import AuthSession, User, UserRole

MIN_PASSWORD_LENGTH = 12
_email = TypeAdapter(EmailStr)


def normalise_email(raw: str) -> str:
    """Validate like the login endpoint does, so the CLI never creates an account that cannot sign in."""
    try:
        return str(_email.validate_python(raw.strip())).lower()
    except ValidationError:
        sys.exit(f"Not a valid email address: {raw}")


def read_password() -> str:
    password = os.environ.get("ADMIN_PASSWORD")
    if password is None:
        password = getpass.getpass("Password: ")
        if getpass.getpass("Repeat password: ") != password:
            sys.exit("Passwords do not match")
    if len(password) < MIN_PASSWORD_LENGTH:
        sys.exit(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    return password


async def create_user(email: str, name: str, role: UserRole) -> None:
    email = normalise_email(email)
    async with SessionLocal() as session:
        if await session.scalar(select(User).where(User.email == email)):
            sys.exit(f"A user with email {email} already exists")
        session.add(User(email=email, name=name, role=role, password_hash=hash_password(read_password())))
        await session.commit()
    print(f"Created {role.value} {email}")


async def set_password(email: str) -> None:
    async with SessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == email))
        if user is None:
            sys.exit(f"No user with email {email}")
        user.password_hash = hash_password(read_password())
        await _revoke_sessions(session, user)
        await session.commit()
    print(f"Password changed for {email}; existing sessions were signed out")


async def deactivate(email: str) -> None:
    async with SessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == email))
        if user is None:
            sys.exit(f"No user with email {email}")
        user.is_active = False
        await _revoke_sessions(session, user)
        await session.commit()
    print(f"Deactivated {email}")


async def reset_mfa(email: str) -> None:
    async with SessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == email))
        if user is None:
            sys.exit(f"No user with email {email}")
        user.totp_secret_enc = None
        user.totp_enabled_at = None
        user.totp_last_step = None
        user.backup_code_hashes = []
        await _revoke_sessions(session, user)
        await session.commit()
    print(f"Two-factor sign-in reset for {email}; they must set it up again at their next sign-in")


async def _revoke_sessions(session: AsyncSession, user: User) -> None:
    await session.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)

    create = commands.add_parser("create-user", help="Create an admin user")
    create.add_argument("--email", required=True)
    create.add_argument("--name", required=True)
    create.add_argument("--role", choices=[r.value for r in UserRole], default=UserRole.editor.value)

    for name in ("set-password", "deactivate", "reset-mfa"):
        sub = commands.add_parser(name)
        sub.add_argument("--email", required=True)

    args = parser.parse_args(argv)
    email = normalise_email(args.email)

    async def run() -> None:
        try:
            if args.command == "create-user":
                await create_user(email, args.name.strip(), UserRole(args.role))
            elif args.command == "set-password":
                await set_password(email)
            elif args.command == "reset-mfa":
                await reset_mfa(email)
            else:
                await deactivate(email)
        finally:
            await engine.dispose()

    asyncio.run(run())


if __name__ == "__main__":
    main()
