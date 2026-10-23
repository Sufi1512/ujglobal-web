"""Outgoing email over SMTP: Mailpit locally, Resend or Postmark's SMTP endpoint in production."""

import html
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from pathlib import Path
from string import Template

import aiosmtplib

from app.core.config import Settings, get_settings
from app.models import Lead, LeadSource

# Every value substituted into the template is HTML-escaped first.
_TEMPLATE = Template((Path(__file__).parent / "templates" / "lead_alert.html").read_text(encoding="utf-8"))

SOURCE_LABELS = {
    LeadSource.contact: "contact form",
    LeadSource.wizard: "project brief",
    LeadSource.chat: "AI chat",
    LeadSource.booking: "call booking",
}


def _one_line(text: str | None, limit: int = 120) -> str:
    """Header-safe text: no line breaks (header injection) and a sane length."""
    flat = " ".join((text or "").split())
    return flat if len(flat) <= limit else flat[: limit - 1] + "…"


def lead_link(lead: Lead, settings: Settings) -> str:
    return f"{settings.admin_base_url.rstrip('/')}/admin/leads/{lead.id}"


def _detail_rows(lead: Lead) -> list[tuple[str, str]]:
    rows = [("Email", lead.email)]
    optional = [
        ("Phone", lead.phone),
        ("Company", lead.company),
        ("Services", ", ".join(lead.services or [])),
        ("Budget", lead.budget_range),
        ("Timeline", lead.timeline),
        ("Landing page", lead.landing_page),
        ("Referrer", lead.referrer),
        ("Campaign", " · ".join(f"{k}: {v}" for k, v in (lead.utm or {}).items())),
    ]
    rows += [(label, value) for label, value in optional if value]
    rows.append(("Consent", "Agreed to be contacted" if lead.consent else "Not given"))
    rows.append(("Received", lead.created_at.strftime("%d %b %Y, %H:%M UTC")))
    return rows


def build_lead_alert(lead: Lead, settings: Settings) -> EmailMessage:
    """The email the team gets for a new lead. Replying goes straight to the lead."""
    source = SOURCE_LABELS.get(lead.source, lead.source.value)
    who = _one_line(lead.name, 60) + (f" ({_one_line(lead.company, 60)})" if lead.company else "")
    link = lead_link(lead, settings)
    rows = _detail_rows(lead)

    msg = EmailMessage()
    msg["Subject"] = f"New lead: {who} via {source}"
    msg["From"] = settings.email_from
    msg["To"] = ", ".join(settings.lead_alert_recipients)
    msg["Reply-To"] = formataddr((_one_line(lead.name, 60), lead.email))
    msg["Message-ID"] = make_msgid(domain="ujglobal.tech")
    # Tells auto-responders on the team side not to answer the alert.
    msg["Auto-Submitted"] = "auto-generated"

    text_rows = "\n".join(f"{label}: {value}" for label, value in rows)
    msg.set_content(
        f"New lead from the {source}.\n\n"
        f"{lead.name}\n{text_rows}\n\n"
        f"Message:\n{lead.message}\n\n"
        f"Open in the leads inbox: {link}\n\n"
        f"Reply to this email to answer {lead.name} directly.\n"
    )

    esc = html.escape
    html_rows = "".join(
        f'<tr><td style="padding:4px 16px 4px 0;color:#51607a;vertical-align:top;white-space:nowrap">'
        f'{esc(label)}</td><td style="padding:4px 0">{esc(value)}</td></tr>'
        for label, value in rows
    )
    page = _TEMPLATE.substitute(
        source=esc(source),
        name=esc(lead.name),
        rows=html_rows,
        message=esc(lead.message).replace("\n", "<br>"),
        link=esc(link),
    )
    msg.add_alternative(page, subtype="html")
    return msg


async def send_email(msg: EmailMessage, settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_username or None,
        password=settings.smtp_password or None,
        use_tls=settings.smtp_security == "tls",
        start_tls=True if settings.smtp_security == "starttls" else False,
        timeout=20,
    )


SECURITY_ALERT_TEXT = {
    "signin_locked": (
        "Sign-in locked after repeated failures",
        "UJ Global admin sign-in was locked for {minutes} minutes "
        "after {failures} failed {what} attempts.\n\n"
        "Account tried: {account}\nVisitor (hashed IP): {ip_hash}\n\n"
        "If this was you, wait and try again. If not, someone may be guessing passwords: check that every "
        "admin account uses a strong, unique password and has two-factor sign-in turned on.",
    ),
}


def build_security_alert(
    kind: str, details: dict[str, str], recipients: list[str], settings: Settings
) -> EmailMessage:
    """Plain-text email to the owners about a security event. Values are flattened to single lines."""
    subject, body = SECURITY_ALERT_TEXT.get(kind, ("Security event", "Security event: {what}"))
    safe = {k: _one_line(v, 200) or "(not recorded)" for k, v in details.items()}
    msg = EmailMessage()
    msg["Subject"] = f"[UJ Global security] {subject}"
    msg["From"] = settings.email_from
    msg["To"] = ", ".join(recipients)
    msg["Message-ID"] = make_msgid(domain="ujglobal.tech")
    msg["Auto-Submitted"] = "auto-generated"
    msg.set_content(
        body.format_map({"what": "", "account": "", "ip_hash": "", "failures": "", "minutes": "", **safe})
    )
    return msg
