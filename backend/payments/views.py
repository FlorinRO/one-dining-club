from django.db import transaction
from rest_framework import permissions, response, serializers, status
from rest_framework.views import APIView

from orders.serializers import OrderCreateSerializer, OrderSerializer
from payments.services import (
    PaymentConfigurationError,
    PaymentProcessingError,
    build_checkout_response,
    construct_webhook_event,
    create_or_update_payment_intent,
    is_online_payment_method,
    sync_payment_from_intent,
)


class CheckoutView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @transaction.atomic
    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        try:
            order = serializer.save()
            payload = {
                "order": OrderSerializer(order, context={"request": request}).data,
            }
            if is_online_payment_method(order.payment_method):
                intent = create_or_update_payment_intent(order.payment)
                payload["payment_sheet"] = build_checkout_response(order.payment, intent)
        except PaymentConfigurationError as exc:
            raise serializers.ValidationError({"payment": str(exc)}) from exc
        except PaymentProcessingError as exc:
            raise serializers.ValidationError({"payment": str(exc)}) from exc

        return response.Response(payload, status=status.HTTP_201_CREATED)


class StripeWebhookView(APIView):
    authentication_classes = ()
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        try:
            event = construct_webhook_event(request.body, request.META.get("HTTP_STRIPE_SIGNATURE", ""))
        except PaymentConfigurationError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except PaymentProcessingError:
            return response.Response({"detail": "Invalid Stripe webhook signature."}, status=status.HTTP_400_BAD_REQUEST)

        if event.get("type") in {
            "payment_intent.succeeded",
            "payment_intent.processing",
            "payment_intent.payment_failed",
            "payment_intent.canceled",
        }:
            try:
                sync_payment_from_intent(event["data"]["object"])
            except Exception:
                return response.Response({"detail": "Webhook could not be processed."}, status=status.HTTP_400_BAD_REQUEST)

        return response.Response({"received": True})
