import pytest
from pydantic import ValidationError

from app.core.config import Settings

PRODUCTION_READY = {
    "environment": "production",
    "jwt_secret": "x" * 40,
    "ip_hash_salt": "a-real-random-salt",
    "smtp_host": "smtp.resend.com",
    "revalidate_secret": "another-random-shared-value",
    "mfa_encryption_key": "m" * 40,
    "database_url": "postgresql+asyncpg://ujglobal:pw@db.example:5432/ujglobal",
}


def test_production_settings_load_when_everything_is_set():
    settings = Settings(**PRODUCTION_READY)
    assert settings.smtp_host == "smtp.resend.com"


@pytest.mark.parametrize(
    ("override", "message"),
    [
        ({"jwt_secret": "short"}, "JWT_SECRET"),
        ({"ip_hash_salt": "change-me"}, "IP_HASH_SALT"),
        ({"smtp_host": "localhost"}, "SMTP_HOST"),
        ({"smtp_host": ""}, "SMTP_HOST"),
        ({"revalidate_secret": "dev-only-revalidate-secret"}, "REVALIDATE_SECRET"),
        ({"mfa_encryption_key": "dev-only-insecure-mfa-key-change-me"}, "MFA_ENCRYPTION_KEY"),
        ({"mfa_encryption_key": "too-short"}, "MFA_ENCRYPTION_KEY"),
    ],
)
def test_production_refuses_unsafe_defaults(override, message):
    with pytest.raises(ValidationError, match=message):
        Settings(**{**PRODUCTION_READY, **override})


def test_alerts_can_be_switched_off_without_smtp():
    settings = Settings(**{**PRODUCTION_READY, "smtp_host": "localhost", "lead_alert_recipients": []})
    assert settings.lead_alert_recipients == []


def test_local_development_needs_no_secrets():
    assert Settings(environment="local").smtp_host == "localhost"


@pytest.mark.parametrize("url", ["", "   "])
def test_database_url_is_required_with_no_default(url, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(ValidationError, match="DATABASE_URL is required"):
        Settings(database_url=url)
    with pytest.raises(ValidationError, match="DATABASE_URL is required"):
        Settings(_env_file=None)


@pytest.mark.parametrize(
    "url",
    ["mysql://u:p@h/db", "postgresql+asyncpg://u:p@h:5432", "postgresql+asyncpg://h:5432/db"],
)
def test_database_url_must_be_postgres_with_user_and_database(url):
    with pytest.raises(ValidationError, match="DATABASE_URL must"):
        Settings(database_url=url)


def test_plain_postgres_urls_get_the_async_driver():
    settings = Settings(
        database_url="postgres://u:p@h:5432/site", database_admin_url="postgresql://admin:p@h:5432/postgres"
    )
    assert settings.database_url == "postgresql+asyncpg://u:p@h:5432/site"
    assert settings.database_admin_url == "postgresql+asyncpg://admin:p@h:5432/postgres"


def test_example_email_placeholders_are_refused():
    with pytest.raises(ValidationError, match="SMTP_HOST and SMTP_PASSWORD"):
        Settings(
            **{**PRODUCTION_READY, "smtp_host": "REPLACE_smtp_server", "smtp_password": "REPLACE_password"}
        )
    # With alerts off the placeholders don't matter.
    Settings(**{**PRODUCTION_READY, "smtp_host": "REPLACE_smtp_server", "lead_alert_recipients": []})
