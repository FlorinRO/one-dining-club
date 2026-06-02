import logging
import json
from email.utils import parseaddr
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.mail import send_mail


logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    pass


def _build_sendgrid_content(message, html_message):
    content = []
    if message:
        content.append({"type": "text/plain", "value": message})
    if html_message:
        content.append({"type": "text/html", "value": html_message})
    return content or [{"type": "text/plain", "value": ""}]


def _send_via_sendgrid(*, subject, message, recipient_list, html_message, from_email):
    sender_name, sender_address = parseaddr(from_email)
    payload = {
        "personalizations": [
            {
                "to": [{"email": recipient} for recipient in recipient_list],
            }
        ],
        "from": {
            "email": sender_address,
            "name": sender_name,
        },
        "subject": subject,
        "content": _build_sendgrid_content(message, html_message),
    }
    request = Request(
        url=f"{settings.SENDGRID_API_BASE_URL}/v3/mail/send",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=settings.EMAIL_TIMEOUT) as response:
        return response.status


def send_transactional_email(*, subject, message, recipient_list, html_message=None, from_email=None):
    sender = from_email or settings.DEFAULT_FROM_EMAIL
    try:
        if settings.EMAIL_DELIVERY_PROVIDER == "sendgrid":
            if not settings.SENDGRID_API_KEY:
                raise EmailDeliveryError("SENDGRID_API_KEY is not configured.")
            return _send_via_sendgrid(
                subject=subject,
                message=message,
                recipient_list=recipient_list,
                html_message=html_message,
                from_email=sender,
            )

        return send_mail(
            subject=subject,
            message=message,
            from_email=sender,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
    except EmailDeliveryError:
        raise
    except HTTPError as exc:
        logger.exception(
            "Transactional email delivery failed with provider response.",
            extra={
                "provider": settings.EMAIL_DELIVERY_PROVIDER,
                "status_code": exc.code,
                "subject": subject,
                "recipient_list": recipient_list,
                "from_email": sender,
            },
        )
        raise EmailDeliveryError("Transactional email delivery failed.") from exc
    except (URLError, TimeoutError, Exception) as exc:
        logger.exception(
            "Transactional email delivery failed.",
            extra={
                "provider": settings.EMAIL_DELIVERY_PROVIDER,
                "subject": subject,
                "recipient_list": recipient_list,
                "from_email": sender,
            },
        )
        raise EmailDeliveryError("Transactional email delivery failed.") from exc
