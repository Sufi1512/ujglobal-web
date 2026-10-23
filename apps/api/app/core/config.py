from functools import lru_cache
from typing import Literal

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

    # Background jobs (ARQ) and email. Locally SMTP goes to Mailpit; in production point it at the
    # SMTP endpoint of Resend or Postmark, so switching provider is a config change only.
    redis_url: str = "redis://localhost:6379/0"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: str | None = None
    smtp_password: str | None = None
    # "starttls" (port 587), "tls" (implicit TLS, port 465) or "none" (Mailpit only).
    smtp_security: Literal["starttls", "tls", "none"] = "none"
    email_from: str = "UJ Global <no-reply@ujglobal.tech>"
    # Who gets an email for every new lead. Empty means alerts are switched off.
    lead_alert_recipients: list[str] = ["team@ujglobal.tech"]
    # Leads with no activity for this many days are deleted automatically (won clients are kept).
    # Must match the privacy policy page (apps/web/src/app/(site)/privacy). 0 keeps them forever.
    lead_retention_days: int = 730

    # Base URL of the admin panel, used for "open in inbox" links in alerts.
    admin_base_url: str = "http://localhost:3000"

    # After content changes the worker asks the Next.js site to refresh its cached pages.
    # Empty URL turns this off; pages then still refresh on their own within 5 minutes.
    web_revalidate_url: str | None = "http://localhost:3000/api/revalidate"
    revalidate_secret: str = "dev-only-revalidate-secret"

    @model_validator(mode="after")
    def require_real_secrets_outside_dev(self) -> "Settings":
        if self.environment not in {"local", "test"}:
            if self.jwt_secret == DEV_JWT_SECRET or len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be set to a random value of at least 32 characters")
            if self.ip_hash_salt == "change-me":
                raise ValueError("IP_HASH_SALT must be changed outside local development")
            if self.web_revalidate_url and self.revalidate_secret == "dev-only-revalidate-secret":
                raise ValueError("REVALIDATE_SECRET must be set to a random value shared with the web app")
            if self.lead_alert_recipients and self.smtp_host.strip() in {"", "localhost", "127.0.0.1"}:
                raise ValueError(
                    "SMTP_HOST must point at the email provider, "
                    "or set LEAD_ALERT_RECIPIENTS=[] to turn lead alerts off"
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
