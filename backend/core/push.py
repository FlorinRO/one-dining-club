import json
import logging
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from users.models import PushDevice

logger = logging.getLogger(__name__)

EXPO_PUSH_CHUNK_SIZE = 100


def send_push_to_user(user, *, title, body, data=None, channel_id="orders", sound="default"):
    return send_push_to_users([user], title=title, body=body, data=data, channel_id=channel_id, sound=sound)


def send_push_to_users(users, *, title, body, data=None, channel_id="orders", sound="default"):
    if not settings.PUSH_NOTIFICATIONS_ENABLED:
        return 0

    user_ids = [getattr(user, "id", user) for user in users if getattr(user, "id", user)]
    if not user_ids:
        return 0

    tokens = list(
        PushDevice.objects.filter(user_id__in=user_ids, is_active=True).values_list("expo_push_token", flat=True)
    )
    return send_push_to_tokens(tokens, title=title, body=body, data=data, channel_id=channel_id, sound=sound)


def send_push_to_tokens(tokens, *, title, body, data=None, channel_id="orders", sound="default"):
    unique_tokens = list(dict.fromkeys(token for token in tokens if token))
    if not settings.PUSH_NOTIFICATIONS_ENABLED or not unique_tokens:
        return 0

    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "sound": sound,
            "channelId": channel_id,
            "priority": "high",
            "data": data or {},
        }
        for token in unique_tokens
    ]

    sent_count = 0
    for start in range(0, len(messages), EXPO_PUSH_CHUNK_SIZE):
        sent_count += _send_push_chunk(messages[start : start + EXPO_PUSH_CHUNK_SIZE])
    return sent_count


def _send_push_chunk(messages):
    request_body = json.dumps(messages).encode("utf-8")
    headers = {
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
    }
    if settings.EXPO_PUSH_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {settings.EXPO_PUSH_ACCESS_TOKEN}"

    request = Request(settings.EXPO_PUSH_API_URL, data=request_body, headers=headers, method="POST")
    try:
        with urlopen(request, timeout=settings.EXPO_PUSH_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        logger.exception("Expo push request failed.")
        return 0

    _deactivate_invalid_tokens(messages, payload)
    return sum(1 for ticket in payload.get("data", []) if ticket.get("status") == "ok")


def _deactivate_invalid_tokens(messages, payload):
    invalid_tokens = []
    for message, ticket in zip(messages, payload.get("data", [])):
        details = ticket.get("details") or {}
        if ticket.get("status") == "error" and details.get("error") == "DeviceNotRegistered":
            invalid_tokens.append(message["to"])

    if invalid_tokens:
        PushDevice.objects.filter(expo_push_token__in=invalid_tokens).update(is_active=False)
