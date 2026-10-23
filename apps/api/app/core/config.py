from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_JWT_SECRET = "dev-only-insecure-jwt-secret-change-me"
DEV_MFA_KEY = "dev-only-insecure-mfa-key-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "local"
    # Required, with no default: the PostgreSQL the site uses, including the database name. That database
    # is created on start if it doesn't exist (app/db_bootstrap.py). postgres:// and postgresql:// URLs
    # are accepted and switched to the async driver.
    database_url: str = ""
    # Optional admin connection (e.g. the `postgres` superuser), used only at start-up to create the
    # site's database user and database when they don't exist yet. Without it the API creates just the
    # database, which needs the DATABASE_URL user to be allowed to (CREATEDB).
    database_admin_url: str | None = None
    cors_origins: list[str] = ["http://localhost:9006"]
    ip_hash_salt: str = "change-me"

    # Admin auth: short-lived JWT access tokens plus an opaque refresh token in an httpOnly cookie.
    jwt_secret: str = DEV_JWT_SECRET
    access_token_minutes: int = 15
    refresh_token_days: int = 14
    # Secure cookies need HTTPS; only plain-HTTP local development turns this off.
    cookie_secure: bool = True

    # Two-factor sign-in. Secrets are encrypted at rest with a key derived from MFA_ENCRYPTION_KEY
    # (changing it disables everyone's authenticator, so keep it with the other secrets). Roles listed in
    # MFA_REQUIRED_ROLES can't use the admin until they have set up an authenticator app.
    mfa_encryption_key: str = DEV_MFA_KEY
    mfa_required_roles: list[str] = ["owner", "sales"]

    # The visitor's IP comes from this header, which the edge Caddy overwrites with the address it
    # verified (Cloudflare's CF-Connecting-IP only when the request really came from Cloudflare). The API
    # is never reachable except through Caddy, so a visitor can't forge it. Empty = use the TCP peer.
    client_ip_header: str = "x-real-ip"

    # Abuse limits (0 turns a limit off). Windows are in seconds.
    login_max_failures_per_account: int = 10
    login_max_failures_per_ip: int = 20
    login_window_seconds: int = 900
    contact_max_per_ip: int = 5
    contact_window_seconds: int = 3600
    alert_emails_max_per_hour: int = 30

    # Cloudflare Turnstile ("are you human" check) on the contact form. Empty turns the check off; set it
    # together with NEXT_PUBLIC_TURNSTILE_SITE_KEY on the website.
    turnstile_secret: str = ""

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
    admin_base_url: str = "http://localhost:9006"

    # After content changes the worker asks the Next.js site to refresh its cached pages.
    # Empty URL turns this off; pages then still refresh on their own within 5 minutes.
    web_revalidate_url: str | None = "http://localhost:9006/api/revalidate"
    revalidate_secret: str = "dev-only-revalidate-secret"

    @model_validator(mode="after")
    def require_database_url(self) -> "Settings":
        url = self.database_url.strip()
        if not url:
            raise ValueError(
                "DATABASE_URL is required: set it to your PostgreSQL, including the database name, e.g. "
                "postgresql+asyncpg://USER:PASSWORD@HOST:5432/ujglobal (the database is created if missing)"
            )
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                url = "postgresql+asyncpg://" + url[len(prefix) :]
        if not url.startswith("postgresql+asyncpg://"):
            raise ValueError(
                "DATABASE_URL must be a PostgreSQL URL (postgresql://... or postgresql+asyncpg://...)"
            )
        tail = url.split("://", 1)[1]
        database = tail.split("/", 1)[1].split("?", 1)[0] if "/" in tail else ""
        if "@" not in tail or not database:
            raise ValueError(
                "DATABASE_URL must include a user and a database name, e.g. "
                "postgresql+asyncpg://USER:PASSWORD@HOST:5432/ujglobal"
            )
        self.database_url = url
        for prefix in ("postgres://", "postgresql://"):
            if self.database_admin_url and self.database_admin_url.startswith(prefix):
                self.database_admin_url = "postgresql+asyncpg://" + self.database_admin_url[len(prefix) :]
        return self

    @model_validator(mode="after")
    def require_real_secrets_outside_dev(self) -> "Settings":
        if self.environment not in {"local", "test"}:
            if self.jwt_secret == DEV_JWT_SECRET or len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be set to a random value of at least 32 characters")
            if self.mfa_encryption_key == DEV_MFA_KEY or len(self.mfa_encryption_key) < 32:
                raise ValueError("MFA_ENCRYPTION_KEY must be set to a random value of at least 32 characters")
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
