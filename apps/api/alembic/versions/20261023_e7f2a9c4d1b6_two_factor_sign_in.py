"""Two-factor sign-in: encrypted authenticator secret, replay guard and backup codes.

Replaces the unused plain-text `users.totp_secret` column.

Revision ID: e7f2a9c4d1b6
Revises: d4e8f1a2b3c4
Create Date: 2026-10-23 10:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e7f2a9c4d1b6"
down_revision: str | Sequence[str] | None = "d4e8f1a2b3c4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("users", "totp_secret")
    op.add_column("users", sa.Column("totp_secret_enc", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("totp_enabled_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("totp_last_step", sa.Integer(), nullable=True))
    op.add_column(
        "users",
        sa.Column("backup_code_hashes", postgresql.ARRAY(sa.String(64)), nullable=False, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("users", "backup_code_hashes")
    op.drop_column("users", "totp_last_step")
    op.drop_column("users", "totp_enabled_at")
    op.drop_column("users", "totp_secret_enc")
    op.add_column("users", sa.Column("totp_secret", sa.String(64), nullable=True))
