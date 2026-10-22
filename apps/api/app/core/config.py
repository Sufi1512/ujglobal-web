from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_JWT_SECRET = "dev-only-insecure-jwt-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "local"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ujglobal"
    cors_origins: list[str] = ["http://localhost:3000"]
    ip_hash_salt: str = "change-me"

    # Admin auth: short-lived JWT access tokens plus an opaque refresh token in an httpOnly cookie.
    jwt_secret: str = DEV_JWT_SECRET
    access_token_minutes: int = 15
    refresh_token_days: int = 14
    # Secure cookies need HTTPS; only plain-HTTP local development turns this off.
    cookie_secure: bool = True

    @model_validator(mode="after")
    def require_real_secrets_outside_dev(self) -> "Settings":
        if self.environment not in {"local", "test"}:
            if self.jwt_secret == DEV_JWT_SECRET or len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be set to a random value of at least 32 characters")
            if self.ip_hash_salt == "change-me":
                raise ValueError("IP_HASH_SALT must be changed outside local development")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
