"""FastAPI dependencies that protect admin endpoints."""

from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.db import SessionDep
from app.core.security import decode_access_token
from app.models import User, UserRole

_bearer = HTTPBearer(auto_error=False)

_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not signed in",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None:
        raise _UNAUTHENTICATED
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise _UNAUTHENTICATED
    user = await session.get(User, user_id)
    # Deactivated users lose access straight away, even with an unexpired token.
    if user is None or not user.is_active:
        raise _UNAUTHENTICATED
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


MFA_SETUP_REQUIRED = "Two-factor sign-in is required for your role. Set it up under Security first."


def require_roles(*roles: UserRole) -> Callable[[User], Awaitable[User]]:
    """Dependency that allows only the given roles. Owners are always allowed.

    Roles in MFA_REQUIRED_ROLES must also have two-factor sign-in turned on: until they do, they can sign
    in and set it up, but every protected admin endpoint answers 403.
    """
    allowed = {UserRole.owner, *roles}

    async def check(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed for your role")
        if user.mfa_required and not user.mfa_enabled:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=MFA_SETUP_REQUIRED)
        return user

    return check
