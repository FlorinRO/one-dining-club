from datetime import datetime, time, timedelta
from decimal import Decimal
from math import asin, cos, radians, sin, sqrt

from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import decorators, parsers, response, status, views, viewsets

from core.permissions import IsCourier
from couriers.dispatch import dispatch_next_courier, dispatch_waiting_orders, process_expired_offers
from couriers.models import (
    CourierAvailabilitySession,
    CourierDispatchOffer,
    CourierOperationEntry,
    CourierProfile,
    CourierSupportTicket,
    Delivery,
    DeliveryStatus,
    DispatchOfferStatus,
)
from couriers.serializers import (
    CourierDocumentSerializer,
    CourierOperationEntrySerializer,
    CourierProfileSerializer,
    CourierProfileUpdateSerializer,
    CourierSupportTicketSerializer,
    build_missing_document_payload,
    required_courier_document_types,
)
from orders.history import log_order_courier_assigned, log_order_status_changed
from orders.models import Order, OrderStatus
from orders.notifications import queue_order_status_push
from orders.serializers import CourierOrderStatusSerializer, OrderSerializer

RECENT_DELIVERY_DAYS = 7


def _period_bounds_today():
    current_timezone = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(timezone.localdate(), time.min), current_timezone)
    return start, start + timedelta(days=1)


def _period_bounds_week():
    today = timezone.localdate()
    start_date = today - timedelta(days=today.weekday())
    current_timezone = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(start_date, time.min), current_timezone)
    return start, start + timedelta(days=7)


def _period_bounds_month():
    today = timezone.localdate()
    current_timezone = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(today.replace(day=1), time.min), current_timezone)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def _delivered_orders_for_period(courier, start, end):
    return (
        Order.objects.select_related("customer", "restaurant", "courier", "courier__courier_profile", "address", "delivery")
        .prefetch_related("items__options")
        .filter(courier=courier, order_status=OrderStatus.DELIVERED)
        .filter(
            Q(delivery__delivered_time__gte=start, delivery__delivered_time__lt=end)
            | Q(delivery__delivered_time__isnull=True, updated_at__gte=start, updated_at__lt=end)
        )
    )


def _delivered_orders_for_courier(courier):
    return (
        Order.objects.select_related("restaurant", "address", "delivery")
        .filter(courier=courier, order_status=OrderStatus.DELIVERED)
    )


def _operation_entries_for_period(courier, start, end):
    return CourierOperationEntry.objects.filter(courier=courier, completed_at__gte=start, completed_at__lt=end)


def _operation_entries_for_courier(courier):
    return CourierOperationEntry.objects.filter(courier=courier)


def _decimal_money(value):
    amount = value or Decimal("0.00")
    return f"{amount:.2f}"


def _distance_km_between_points(start_latitude, start_longitude, end_latitude, end_longitude):
    if None in (start_latitude, start_longitude, end_latitude, end_longitude):
        return None

    start_lat = radians(float(start_latitude))
    start_lng = radians(float(start_longitude))
    end_lat = radians(float(end_latitude))
    end_lng = radians(float(end_longitude))
    delta_lat = end_lat - start_lat
    delta_lng = end_lng - start_lng
    haversine = sin(delta_lat / 2) ** 2 + cos(start_lat) * cos(end_lat) * sin(delta_lng / 2) ** 2
    return 6371 * 2 * asin(sqrt(haversine))


def _order_distance_km(order):
    delivery = getattr(order, "delivery", None)
    if delivery and delivery.distance_km is not None:
        return float(delivery.distance_km)
    if not order.address:
        return 0
    distance = _distance_km_between_points(
        order.restaurant.latitude,
        order.restaurant.longitude,
        order.address.latitude,
        order.address.longitude,
    )
    return round(distance or 0, 1)


def _delivery_durations_minutes(orders):
    durations = []
    for order in orders:
        delivery = getattr(order, "delivery", None)
        if not delivery or not delivery.pickup_time:
            continue
        delivered_at = delivery.delivered_time or order.updated_at
        duration_seconds = (delivered_at - delivery.pickup_time).total_seconds()
        if duration_seconds > 0:
            durations.append(round(duration_seconds / 60))
    return durations


def _delivery_duration_minutes(order):
    delivery = getattr(order, "delivery", None)
    if not delivery or not delivery.pickup_time:
        return None
    delivered_at = delivery.delivered_time or order.updated_at
    duration_seconds = (delivered_at - delivery.pickup_time).total_seconds()
    if duration_seconds <= 0:
        return None
    return round(duration_seconds / 60)


def _average_minutes(values):
    durations = [value for value in values if value is not None]
    if not durations:
        return None
    return round(sum(durations) / len(durations))


def _online_minutes_today(courier):
    today_start, today_end = _period_bounds_today()
    now = timezone.now()
    effective_end = min(today_end, now)
    sessions = CourierAvailabilitySession.objects.filter(courier=courier, started_at__lt=effective_end).filter(
        Q(ended_at__isnull=True) | Q(ended_at__gt=today_start)
    )
    total_seconds = 0
    for session in sessions:
        session_start = max(session.started_at, today_start)
        session_end = min(session.ended_at or now, effective_end)
        if session_end > session_start:
            total_seconds += (session_end - session_start).total_seconds()
    return round(total_seconds / 60)


def _sync_availability_session(courier, previous_availability, next_availability):
    if previous_availability == next_availability:
        if next_availability and not CourierAvailabilitySession.objects.filter(courier=courier, ended_at__isnull=True).exists():
            CourierAvailabilitySession.objects.create(courier=courier, started_at=timezone.now())
        return

    now = timezone.now()
    if next_availability:
        if not CourierAvailabilitySession.objects.filter(courier=courier, ended_at__isnull=True).exists():
            CourierAvailabilitySession.objects.create(courier=courier, started_at=now)
        return

    CourierAvailabilitySession.objects.filter(courier=courier, ended_at__isnull=True).update(ended_at=now)


def _completed_at_for_order(order):
    delivery = getattr(order, "delivery", None)
    return getattr(delivery, "delivered_time", None) or order.updated_at


def _serialize_recent_deliveries(request, start, end):
    delivered_orders = list(_delivered_orders_for_period(request.user, start, end))
    serialized_orders = OrderSerializer(delivered_orders, many=True, context={"request": request}).data
    recent_deliveries = []

    for order, order_payload in zip(delivered_orders, serialized_orders):
        recent_deliveries.append(
            {
                "id": f"order:{order.id}",
                "source": "order",
                "order_id": order.id,
                "operation_entry_id": None,
                "reference_id": "",
                "completed_at": _completed_at_for_order(order),
                "delivery_fee": _decimal_money(order.delivery_fee),
                "distance_km": _order_distance_km(order),
                "duration_minutes": _delivery_duration_minutes(order),
                "restaurant_name": order_payload["restaurant_name"],
                "dropoff_address": order_payload["address_summary"],
                "customer_name": order_payload["customer_name"],
                "payment_method_label": order_payload["payment_method_label"],
                "total": order_payload["total"],
                "status": order.order_status,
                "status_label": order_payload["order_status_label"],
                "items": order_payload["items"],
                "order": order_payload,
            }
        )

    for entry in _operation_entries_for_period(request.user, start, end):
        metadata = entry.metadata or {}
        recent_deliveries.append(
            {
                "id": f"simulation:{entry.id}",
                "source": entry.source,
                "order_id": None,
                "operation_entry_id": entry.id,
                "reference_id": entry.reference_id,
                "completed_at": entry.completed_at,
                "delivery_fee": _decimal_money(entry.delivery_fee),
                "distance_km": float(entry.distance_km),
                "duration_minutes": entry.duration_minutes,
                "restaurant_name": metadata.get("restaurant_name") or "Cursă simulată",
                "dropoff_address": metadata.get("dropoff_address") or f"Referință backend {entry.reference_id}",
                "customer_name": metadata.get("customer_name") or "Client simulat",
                "payment_method_label": "Simulare",
                "total": _decimal_money(entry.delivery_fee),
                "status": "delivered",
                "status_label": "Livrată",
                "items": [],
                "metadata": metadata,
                "order": None,
            }
        )

    return sorted(recent_deliveries, key=lambda delivery: delivery["completed_at"], reverse=True)


class CourierOrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = (IsCourier,)
    filterset_fields = ("order_status",)
    ordering_fields = ("created_at", "total")

    def get_queryset(self):
        process_expired_offers()
        now = timezone.now()
        return (
            Order.objects.select_related("customer", "restaurant", "courier", "courier__courier_profile", "address", "delivery")
            .prefetch_related("items__options", "events__actor", "events__courier")
            .filter(
                order_status=OrderStatus.READY_FOR_PICKUP,
                courier__isnull=True,
                dispatch_offers__courier=self.request.user,
                dispatch_offers__status=DispatchOfferStatus.OFFERED,
                dispatch_offers__expires_at__gt=now,
            )
            | Order.objects.select_related("customer", "restaurant", "courier", "courier__courier_profile", "address", "delivery")
            .prefetch_related("items__options", "events__actor", "events__courier")
            .filter(courier=self.request.user)
        )

    @decorators.action(detail=True, methods=["patch"])
    def accept(self, request, pk=None):
        now = timezone.now()
        with transaction.atomic():
            order = Order.objects.select_for_update().filter(pk=pk).first()
            if not order:
                return response.Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
            offer = CourierDispatchOffer.objects.select_for_update().filter(
                order=order,
                courier=request.user,
                status=DispatchOfferStatus.OFFERED,
            ).first()
            if not offer or offer.expires_at <= now:
                if offer:
                    offer.status = DispatchOfferStatus.EXPIRED
                    offer.responded_at = now
                    offer.save(update_fields=("status", "responded_at"))
                    transaction.on_commit(lambda: dispatch_next_courier(order.id))
                return response.Response({"detail": "Oferta a expirat."}, status=status.HTTP_409_CONFLICT)
            if order.courier_id or order.order_status != OrderStatus.READY_FOR_PICKUP:
                offer.status = DispatchOfferStatus.CANCELLED
                offer.responded_at = now
                offer.save(update_fields=("status", "responded_at"))
                return response.Response({"detail": "Comanda nu mai este disponibilă."}, status=status.HTTP_409_CONFLICT)

            order.courier = request.user
            order.save(update_fields=("courier", "updated_at"))
            offer.status = DispatchOfferStatus.ACCEPTED
            offer.responded_at = now
            offer.save(update_fields=("status", "responded_at"))
            order.dispatch_offers.filter(status=DispatchOfferStatus.OFFERED).exclude(pk=offer.pk).update(
                status=DispatchOfferStatus.CANCELLED,
                responded_at=now,
            )
            log_order_courier_assigned(order, courier=request.user, actor=request.user, source="dispatch")
            delivery, created = Delivery.objects.get_or_create(
                order=order,
                defaults={"courier": request.user, "status": DeliveryStatus.ASSIGNED},
            )
            if not created:
                delivery.courier = request.user
                delivery.status = DeliveryStatus.ASSIGNED
                delivery.save(update_fields=("courier", "status"))
        order.refresh_from_db()
        return response.Response(OrderSerializer(order, context={"request": request}).data)

    @decorators.action(detail=True, methods=["patch"])
    def decline(self, request, pk=None):
        now = timezone.now()
        with transaction.atomic():
            offer = CourierDispatchOffer.objects.select_for_update().filter(
                order_id=pk,
                courier=request.user,
                status=DispatchOfferStatus.OFFERED,
            ).first()
            if not offer:
                return response.Response({"detail": "Oferta nu mai este activă."}, status=status.HTTP_409_CONFLICT)
            offer.status = DispatchOfferStatus.DECLINED
            offer.responded_at = now
            offer.save(update_fields=("status", "responded_at"))
            transaction.on_commit(lambda: dispatch_next_courier(offer.order_id))
        return response.Response(status=status.HTTP_204_NO_CONTENT)

    @decorators.action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        order = self.get_object()
        if order.courier_id != request.user.id:
            return response.Response({"detail": "Order is not assigned to you."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CourierOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        previous_status = order.order_status
        order.order_status = serializer.validated_data["order_status"]
        order.save(update_fields=("order_status", "updated_at"))
        log_order_status_changed(order, previous_status=previous_status, actor=request.user, source="courier")
        queue_order_status_push(order, previous_status=previous_status, source="courier")

        delivery, _ = Delivery.objects.get_or_create(order=order, defaults={"courier": request.user})
        delivery.courier = request.user
        delivery.status = {
            OrderStatus.PICKED_UP: DeliveryStatus.PICKED_UP,
            OrderStatus.ON_THE_WAY: DeliveryStatus.ON_THE_WAY,
            OrderStatus.DELIVERED: DeliveryStatus.DELIVERED,
            OrderStatus.CANCELLED: DeliveryStatus.CANCELLED,
        }[order.order_status]
        if order.order_status == OrderStatus.PICKED_UP and not delivery.pickup_time:
            delivery.pickup_time = timezone.now()
        if order.order_status == OrderStatus.DELIVERED:
            delivery.delivered_time = timezone.now()
        delivery.save()
        order.refresh_from_db()
        return response.Response(OrderSerializer(order, context={"request": request}).data)


class CourierProfileView(views.APIView):
    permission_classes = (IsCourier,)
    parser_classes = (parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser)

    def get_profile(self, request):
        return CourierProfile.objects.get_or_create(
            user=request.user,
            defaults={"phone": request.user.phone or ""},
        )[0]

    def get(self, request):
        profile = self.get_profile(request)
        return response.Response(CourierProfileSerializer(profile, context={"request": request}).data)

    def patch(self, request):
        serializer = CourierProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = self.get_profile(request)
        previous_availability = profile.is_available
        for field, value in serializer.validated_data.items():
            setattr(profile, field, value)
        profile.save()
        if "phone" in serializer.validated_data and request.user.phone != serializer.validated_data["phone"]:
            request.user.phone = serializer.validated_data["phone"]
            request.user.save(update_fields=("phone",))
        if "is_available" in serializer.validated_data:
            _sync_availability_session(request.user, previous_availability, profile.is_available)
        if profile.is_available and profile.is_verified and profile.current_latitude is not None and profile.current_longitude is not None:
            transaction.on_commit(dispatch_waiting_orders)
        return response.Response(CourierProfileSerializer(profile, context={"request": request}).data)


class CourierOperationsView(views.APIView):
    permission_classes = (IsCourier,)

    def get(self, request):
        today_start, today_end = _period_bounds_today()
        week_start, week_end = _period_bounds_week()
        month_start, month_end = _period_bounds_month()
        recent_start = timezone.now() - timedelta(days=RECENT_DELIVERY_DAYS)

        delivered_today = list(_delivered_orders_for_period(request.user, today_start, today_end))
        delivered_this_week = _delivered_orders_for_period(request.user, week_start, week_end)
        delivered_this_month = _delivered_orders_for_period(request.user, month_start, month_end)
        entries_today = list(_operation_entries_for_period(request.user, today_start, today_end))
        entries_this_week = _operation_entries_for_period(request.user, week_start, week_end)
        entries_this_month = _operation_entries_for_period(request.user, month_start, month_end)
        delivered_all = list(_delivered_orders_for_courier(request.user))
        entries_all = _operation_entries_for_courier(request.user)
        durations_today = _delivery_durations_minutes(delivered_today) + [
            entry.duration_minutes for entry in entries_today if entry.duration_minutes is not None
        ]
        delivered_all_earnings = sum((order.delivery_fee for order in delivered_all), Decimal("0.00"))
        entries_all_aggregate = entries_all.aggregate(total=Sum("delivery_fee"))
        entries_all_earnings = entries_all_aggregate["total"] or Decimal("0.00")

        return response.Response(
            {
                "completed_today": len(delivered_today) + len(entries_today),
                "completed_total": len(delivered_all) + entries_all.count(),
                "distance_today_km": round(
                    sum(_order_distance_km(order) for order in delivered_today)
                    + sum(float(entry.distance_km) for entry in entries_today),
                    1,
                ),
                "distance_total_km": round(
                    sum(_order_distance_km(order) for order in delivered_all)
                    + sum(float(entry.distance_km) for entry in entries_all),
                    1,
                ),
                "average_eta_minutes": _average_minutes(durations_today),
                "earnings_today": _decimal_money(
                    sum((order.delivery_fee for order in delivered_today), Decimal("0.00"))
                    + sum((entry.delivery_fee for entry in entries_today), Decimal("0.00"))
                ),
                "available_balance": _decimal_money(delivered_all_earnings + entries_all_earnings),
                "earnings_this_week": _decimal_money(
                    (delivered_this_week.aggregate(total=Sum("delivery_fee"))["total"] or Decimal("0.00"))
                    + (entries_this_week.aggregate(total=Sum("delivery_fee"))["total"] or Decimal("0.00"))
                ),
                "earnings_this_month": _decimal_money(
                    (delivered_this_month.aggregate(total=Sum("delivery_fee"))["total"] or Decimal("0.00"))
                    + (entries_this_month.aggregate(total=Sum("delivery_fee"))["total"] or Decimal("0.00"))
                ),
                "online_minutes_today": _online_minutes_today(request.user),
                "recent_deliveries": _serialize_recent_deliveries(request, recent_start, timezone.now()),
                "generated_at": timezone.now(),
            }
        )

    def post(self, request):
        serializer = CourierOperationEntrySerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        return response.Response(CourierOperationEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class CourierDocumentView(views.APIView):
    permission_classes = (IsCourier,)

    def get(self, request):
        existing_documents = {
            document.document_type: document
            for document in request.user.courier_documents.all()
        }
        documents = []
        for document_type in required_courier_document_types():
            document = existing_documents.get(document_type.value)
            if document:
                documents.append(CourierDocumentSerializer(document).data)
            else:
                documents.append(build_missing_document_payload(document_type))
        return response.Response({"results": documents})

    def post(self, request):
        serializer = CourierDocumentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        return response.Response(CourierDocumentSerializer(document).data, status=status.HTTP_201_CREATED)


class CourierHelpCenterView(views.APIView):
    permission_classes = (IsCourier,)

    def get(self, request):
        return response.Response(
            {
                "support_email": settings.SUPPORT_EMAIL,
                "articles": [
                    {
                        "id": "qq-simulation",
                        "title": "Cum se contorizează o cursă simulată?",
                        "body": (
                            "Când finalizezi traseul simulat, aplicația trimite cursa către backend. "
                            "Aceasta intră în sold, distanță, timp activ și istoricul ultimelor curse."
                        ),
                    },
                    {
                        "id": "availability",
                        "title": "De ce contează statusul online?",
                        "body": (
                            "Statusul online pornește o tură în backend. Minutele online se calculează din turele deschise și închise."
                        ),
                    },
                    {
                        "id": "documents",
                        "title": "Cum funcționează verificarea documentelor?",
                        "body": (
                            "Documentele trimise din aplicație intră în status pending până când echipa le aprobă sau cere corecturi."
                        ),
                    },
                ],
            }
        )


class CourierSupportTicketView(views.APIView):
    permission_classes = (IsCourier,)

    def get(self, request):
        tickets = CourierSupportTicket.objects.filter(courier=request.user)[:20]
        return response.Response({"results": CourierSupportTicketSerializer(tickets, many=True).data})

    def post(self, request):
        serializer = CourierSupportTicketSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save()
        return response.Response(CourierSupportTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)
