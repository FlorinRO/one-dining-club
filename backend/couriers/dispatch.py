from datetime import timedelta
from decimal import Decimal
from math import asin, cos, radians, sin, sqrt

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from core.push import send_push_to_user
from couriers.models import CourierDispatchOffer, CourierProfile, DispatchOfferStatus
from orders.models import FulfillmentType, Order, OrderStatus


OFFER_TIMEOUT_SECONDS = getattr(settings, "COURIER_DISPATCH_OFFER_TIMEOUT_SECONDS", 30)
LOCATION_MAX_AGE_SECONDS = getattr(settings, "COURIER_LOCATION_MAX_AGE_SECONDS", 300)
ACTIVE_ORDER_STATUSES = (OrderStatus.READY_FOR_PICKUP, OrderStatus.PICKED_UP, OrderStatus.ON_THE_WAY)


def _distance_km(start_latitude, start_longitude, end_latitude, end_longitude):
    start_lat = radians(float(start_latitude))
    start_lng = radians(float(start_longitude))
    end_lat = radians(float(end_latitude))
    end_lng = radians(float(end_longitude))
    delta_lat = end_lat - start_lat
    delta_lng = end_lng - start_lng
    value = sin(delta_lat / 2) ** 2 + cos(start_lat) * cos(end_lat) * sin(delta_lng / 2) ** 2
    return 6371 * 2 * asin(sqrt(value))


def _eligible_candidates(order):
    restaurant = order.restaurant
    if restaurant.latitude is None or restaurant.longitude is None:
        return []

    previously_offered_ids = set(order.dispatch_offers.values_list("courier_id", flat=True))
    busy_courier_ids = Order.objects.filter(
        courier_id__isnull=False,
        order_status__in=ACTIVE_ORDER_STATUSES,
    ).exclude(pk=order.pk).values_list("courier_id", flat=True)
    profiles = CourierProfile.objects.select_related("user").filter(
        user__is_active=True,
        is_available=True,
        current_latitude__isnull=False,
        current_longitude__isnull=False,
        updated_at__gte=timezone.now() - timedelta(seconds=LOCATION_MAX_AGE_SECONDS),
    ).exclude(user_id__in=previously_offered_ids).exclude(user_id__in=busy_courier_ids)

    candidates = [
        (
            _distance_km(
                profile.current_latitude,
                profile.current_longitude,
                restaurant.latitude,
                restaurant.longitude,
            ),
            profile.user,
        )
        for profile in profiles
    ]
    return sorted(candidates, key=lambda candidate: (candidate[0], candidate[1].id))


def dispatch_next_courier(order_id):
    now = timezone.now()
    with transaction.atomic():
        order = Order.objects.select_for_update().select_related("restaurant").get(pk=order_id)
        if (
            order.fulfillment_type != FulfillmentType.DELIVERY
            or order.order_status != OrderStatus.READY_FOR_PICKUP
            or order.courier_id is not None
        ):
            order.dispatch_offers.filter(status=DispatchOfferStatus.OFFERED).update(
                status=DispatchOfferStatus.CANCELLED,
                responded_at=now,
            )
            return None

        active_offer = order.dispatch_offers.filter(
            status=DispatchOfferStatus.OFFERED,
            expires_at__gt=now,
        ).first()
        if active_offer:
            return active_offer

        order.dispatch_offers.filter(status=DispatchOfferStatus.OFFERED).update(
            status=DispatchOfferStatus.EXPIRED,
            responded_at=now,
        )
        candidates = _eligible_candidates(order)
        if not candidates:
            return None

        distance_km, courier = candidates[0]
        offer = CourierDispatchOffer.objects.create(
            order=order,
            courier=courier,
            distance_km=Decimal(str(round(distance_km, 2))),
            expires_at=now + timedelta(seconds=OFFER_TIMEOUT_SECONDS),
        )
        transaction.on_commit(lambda: _notify_offer(offer.id))
        return offer


def process_expired_offers():
    order_ids = list(
        CourierDispatchOffer.objects.filter(
            status=DispatchOfferStatus.OFFERED,
            expires_at__lte=timezone.now(),
        ).values_list("order_id", flat=True).distinct()
    )
    for order_id in order_ids:
        dispatch_next_courier(order_id)
    return len(order_ids)


def dispatch_waiting_orders():
    order_ids = list(
        Order.objects.filter(
            fulfillment_type=FulfillmentType.DELIVERY,
            order_status=OrderStatus.READY_FOR_PICKUP,
            courier__isnull=True,
        ).values_list("id", flat=True)
    )
    for order_id in order_ids:
        dispatch_next_courier(order_id)


def cancel_dispatch(order_id):
    CourierDispatchOffer.objects.filter(order_id=order_id, status=DispatchOfferStatus.OFFERED).update(
        status=DispatchOfferStatus.CANCELLED,
        responded_at=timezone.now(),
    )


def _notify_offer(offer_id):
    offer = CourierDispatchOffer.objects.select_related("courier", "order__restaurant").filter(pk=offer_id).first()
    if not offer or offer.status != DispatchOfferStatus.OFFERED:
        return
    send_push_to_user(
        offer.courier,
        title="Comandă nouă disponibilă",
        body=f"{offer.order.restaurant.name} • {offer.distance_km} km până la ridicare",
        data={
            "event": "courier_dispatch_offer",
            "order_id": offer.order_id,
            "offer_expires_at": offer.expires_at.isoformat(),
        },
    )
