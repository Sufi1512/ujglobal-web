"""Records admin changes in the audit_log table, in the same transaction as the change itself."""

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog, User


def _jsonable(value: Any) -> Any:
    if isinstance(value, uuid.UUID | datetime):
        return str(value)
    if isinstance(value, enum.Enum):
        return value.value
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, list | tuple | set):
        return [_jsonable(v) for v in value]
    return value


def changes(before: dict[str, Any], after: dict[str, Any]) -> dict[str, list[Any]]:
    """{field: [old, new]} for every field whose value changed."""
    return {
        key: [_jsonable(before.get(key)), _jsonable(after.get(key))]
        for key in sorted(set(before) | set(after))
        if _jsonable(before.get(key)) != _jsonable(after.get(key))
    }


def record(
    session: AsyncSession,
    user: User,
    action: str,
    entity: str,
    entity_id: uuid.UUID,
    diff: dict[str, Any],
) -> None:
    session.add(
        AuditLog(user_id=user.id, action=action, entity=entity, entity_id=entity_id, diff=_jsonable(diff))
    )
