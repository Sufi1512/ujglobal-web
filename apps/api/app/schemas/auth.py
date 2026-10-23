import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import UserRole


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    role: UserRole
    last_login_at: datetime | None
    mfa_enabled: bool
    mfa_required: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class MfaChallenge(BaseModel):
    """Login answer when the password was right and the account has two-factor sign-in turned on."""

    mfa_required: bool = True
    mfa_token: str


class MfaVerifyIn(BaseModel):
    mfa_token: str = Field(min_length=1, max_length=2048)
    # A 6-digit authenticator code, or a backup code like "k7m2-x9qp".
    code: str = Field(min_length=6, max_length=20)


class MfaSetupOut(BaseModel):
    secret: str
    otpauth_uri: str
    qr_data_uri: str


class MfaCodeIn(BaseModel):
    code: str = Field(min_length=6, max_length=20)


class BackupCodesOut(BaseModel):
    backup_codes: list[str]
