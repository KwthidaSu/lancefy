import logging
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr, parseaddr

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

try:
    from app.core.config import settings as _settings
except ImportError:
    _settings = None


def send_transactional_email(
    to: str,
    subject: str,
    body: str,
):
    """Send a transactional e-mail via SMTP.
    Falls back to a log-only warning if SMTP is not configured.
    """
    smtp_host = getattr(_settings, "SMTP_HOST", None)
    smtp_port = int(getattr(_settings, "SMTP_PORT", 587))
    smtp_user = getattr(_settings, "SMTP_USER", None)
    smtp_password = getattr(_settings, "SMTP_PASSWORD", None)
    smtp_use_tls = bool(getattr(_settings, "SMTP_USE_TLS", True))
    smtp_use_ssl = bool(getattr(_settings, "SMTP_USE_SSL", False))
    sender = getattr(_settings, "EMAIL_FROM", None) or smtp_user
    sender_name = getattr(_settings, "EMAIL_FROM_NAME", None)

    if not smtp_host:
        raise RuntimeError("SMTP_HOST is not configured")
    if not sender:
        raise RuntimeError("EMAIL_FROM or SMTP_USER must be configured")

    parsed_name, parsed_email = parseaddr(sender)
    sender_email = parsed_email or sender
    sender_header_name = sender_name or parsed_name
    sender_header = (
        formataddr((sender_header_name, sender_email))
        if sender_header_name
        else sender_email
    )

    msg = MIMEText(body, "html", "utf-8")
    msg["Subject"] = subject
    msg["From"] = sender_header
    msg["To"] = to

    smtp_cls = smtplib.SMTP_SSL if smtp_use_ssl or smtp_port == 465 else smtplib.SMTP

    with smtp_cls(smtp_host, smtp_port, timeout=10) as smtp:
        smtp.ehlo()
        if smtp_use_tls and smtp_cls is smtplib.SMTP and smtp_port != 25:
            smtp.starttls()
            smtp.ehlo()
        if smtp_user and smtp_password:
            smtp.login(smtp_user, smtp_password)
        smtp.sendmail(sender_email, [to], msg.as_string())
    logger.info("Email sent | to=%s subject=%s", to, subject)


@celery_app.task
def example_task(name: str):
    return f"Hello {name}!"


@celery_app.task(bind=True, max_retries=3)
def send_email_task(self, to: str, subject: str, body: str):
    try:
        send_transactional_email(to=to, subject=subject, body=body)
    except (RuntimeError, smtplib.SMTPException, OSError) as exc:
        logger.exception("Failed to send email | to=%s subject=%s", to, subject)
        raise self.retry(exc=exc, countdown=60)
