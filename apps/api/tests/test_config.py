import pytest
from pydantic import ValidationError

from app.core.config import Settings

PRODUCTION_READY = {
    "environment": "production",
    "jwt_secret": "x" * 40,
    "ip_hash_salt": "a-real-random-salt",
    "smtp_host": "smtp.resend.com",
    "revalidate_secret": "another-random-shared-value",
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
        ({"revalidate_secret": "dev-only-revalidate-secret"}, "REVALIDATE_SECRET"),
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
