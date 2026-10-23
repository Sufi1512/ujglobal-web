import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdTimestampMixin


class UserRole(enum.StrEnum):
    owner = "owner"
    editor = "editor"
    sales = "sales"


class User(IdTimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), default=UserRole.editor)
    # Two-factor sign-in. The authenticator secret is stored encrypted (app/core/mfa.py); it is set when
    # setup starts and only counts once `totp_enabled_at` is set by a first correct code.
    totp_secret_enc: Mapped[str | None] = mapped_column(Text)
    totp_enabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # The last 30-second step a code was accepted for, so a code can't be used twice.
    totp_last_step: Mapped[int | None] = mapped_column(Integer)
    # One-time recovery codes, stored only as SHA-256 hashes; each is removed when used.
    backup_code_hashes: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), default=list, server_default="{}"
    )

    @property
    def mfa_enabled(self) -> bool:
        return self.totp_enabled_at is not None

    @property
    def mfa_required(self) -> bool:
        from app.core.config import get_settings

        return self.role.value in get_settings().mfa_required_roles

    is_active: Mapped[bool] = mapped_column(default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuthSession(IdTimestampMixin, Base):
    """One signed-in admin device. The refresh cookie holds a random token; only its hash is stored."""

    __tablename__ = "auth_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(String(255))
    ip_hash: Mapped[str | None] = mapped_column(String(64))
