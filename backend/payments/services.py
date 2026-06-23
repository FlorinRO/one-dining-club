from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings

from orders.models import OrderStatus, PaymentMethod, PaymentStatus
from payments.models import Payment, PaymentProvider


class PaymentConfigurationError(Exception):
    pass


class PaymentProcessingError(Exception):
    pass


def is_online_payment_method(method):
    return method in {
        PaymentMethod.CARD,
        PaymentMethod.APPLE_PAY,
        PaymentMethod.GOOGLE_PAY,
    }


def payment_provider_for_method(method):
    return {
        PaymentMethod.CASH: PaymentProvider.CASH,
        PaymentMethod.CARD: PaymentProvider.STRIPE,
        PaymentMethod.APPLE_PAY: PaymentProvider.APPLE_PAY,
        PaymentMethod.GOOGLE_PAY: PaymentProvider.GOOGLE_PAY,
    }[method]


def _get_stripe_module():
    if not settings.STRIPE_SECRET_KEY:
        raise PaymentConfigurationError("Stripe is not configured yet.")

    try:
        import stripe
    except ImportError as exc:
        raise PaymentConfigurationError("Stripe SDK is not installed on the backend.") from exc

    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def _amount_to_minor_units(amount):
    return int((Decimal(amount) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def build_checkout_note(payment_method):
    if payment_method == PaymentMethod.APPLE_PAY:
        return "Confirmă cu Apple Pay pe ecranul de plată."
    if payment_method == PaymentMethod.GOOGLE_PAY:
        return "Confirmă cu Google Pay pe ecranul de plată."
    return "Confirmă plata cu cardul pe ecranul de plată."


def create_or_update_payment_intent(payment):
    stripe = _get_stripe_module()
    metadata = {
        "order_id": str(payment.order_id),
        "payment_id": str(payment.id),
        "payment_method": payment.order.payment_method,
    }
    payload = {
        "amount": _amount_to_minor_units(payment.amount),
        "currency": settings.STRIPE_CURRENCY,
        "metadata": metadata,
        "automatic_payment_methods": {"enabled": True},
    }

    try:
        if payment.provider_payment_id:
            intent = stripe.PaymentIntent.modify(payment.provider_payment_id, **payload)
        else:
            intent = stripe.PaymentIntent.create(**payload)
            payment.provider_payment_id = intent.id
            payment.save(update_fields=("provider_payment_id",))
    except Exception as exc:
        raise PaymentProcessingError("Stripe could not prepare the payment intent.") from exc

    return intent


def build_checkout_response(payment, intent):
    return {
        "payment_intent_client_secret": intent.client_secret,
        "payment_intent_id": intent.id,
        "merchant_display_name": settings.STRIPE_MERCHANT_DISPLAY_NAME,
        "merchant_country_code": settings.STRIPE_MERCHANT_COUNTRY_CODE,
        "currency_code": settings.STRIPE_CURRENCY.upper(),
        "payment_method": payment.order.payment_method,
    }


def sync_payment_from_intent(intent_object):
    payment_intent_id = intent_object.get("id", "")
    metadata = intent_object.get("metadata") or {}
    payment_id = metadata.get("payment_id")

    payment_queryset = Payment.objects.select_related("order")
    if payment_id:
        payment = payment_queryset.get(id=payment_id)
    else:
        payment = payment_queryset.get(provider_payment_id=payment_intent_id)

    stripe_status = intent_object.get("status", "")
    next_status = {
        "succeeded": PaymentStatus.PAID,
        "processing": PaymentStatus.PENDING,
        "requires_capture": PaymentStatus.PENDING,
        "requires_action": PaymentStatus.PENDING,
        "requires_confirmation": PaymentStatus.PENDING,
        "requires_payment_method": PaymentStatus.FAILED,
        "canceled": PaymentStatus.FAILED,
    }.get(stripe_status, PaymentStatus.PENDING)

    payment.status = next_status
    payment.provider_payment_id = payment_intent_id or payment.provider_payment_id
    payment.save(update_fields=("status", "provider_payment_id"))

    order = payment.order
    order.payment_status = next_status
    if next_status == PaymentStatus.FAILED and order.order_status == OrderStatus.PENDING:
        order.order_status = OrderStatus.CANCELLED
        order.save(update_fields=("payment_status", "order_status", "updated_at"))
        return payment

    order.save(update_fields=("payment_status", "updated_at"))
    return payment


def construct_webhook_event(payload, signature):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise PaymentConfigurationError("Stripe webhook secret is not configured yet.")

    stripe = _get_stripe_module()
    try:
        return stripe.Webhook.construct_event(payload, signature, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as exc:
        raise PaymentProcessingError("Stripe webhook signature verification failed.") from exc
