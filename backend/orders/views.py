from django.db import transaction
from django.db.models import Q
from rest_framework import decorators, permissions, response, status, viewsets

from core.permissions import IsCustomer, IsRestaurantOwner
from couriers.models import Delivery
from orders.history import log_order_status_changed
from orders.models import Order, OrderEvent, OrderStatus, PaymentMethod, PaymentStatus
from orders.notifications import queue_order_status_push
from orders.serializers import (
    OrderCreateSerializer,
    OrderSerializer,
    RestaurantOwnerOrderStatusSerializer,
)
from restaurants.ownership import get_primary_restaurant_id_for_owner
from reviews.models import update_restaurant_rating
from reviews.serializers import ReviewCreateSerializer, ReviewSerializer


RESTAURANT_VISIBLE_ORDER_FILTER = Q(payment_method=PaymentMethod.CASH) | Q(payment_status=PaymentStatus.PAID)


class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ("get", "post", "patch", "head", "options")

    def get_queryset(self):
        return (
            Order.objects.select_related("customer", "restaurant", "courier", "courier__courier_profile", "address", "delivery")
            .prefetch_related("items__product", "items__options", "events__actor", "events__courier")
            .filter(customer=self.request.user)
        )

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        return OrderSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsCustomer()]
        return super().get_permissions()

    @decorators.action(detail=True, methods=["patch"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if not order.can_customer_cancel:
            return response.Response(
                {"detail": "Order can no longer be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        previous_status = order.order_status
        order.order_status = OrderStatus.CANCELLED
        order.save(update_fields=("order_status", "updated_at"))
        log_order_status_changed(order, previous_status=previous_status, actor=request.user, source="customer_cancel")
        queue_order_status_push(order, previous_status=previous_status, source="customer_cancel")
        order.refresh_from_db()
        serializer = self.get_serializer(order)
        return response.Response(serializer.data)

    @decorators.action(detail=True, methods=["get", "post", "patch"])
    def review(self, request, pk=None):
        order = self.get_object()
        existing_review = getattr(order, "review", None)

        if request.method == "GET":
            if not existing_review:
                return response.Response({"detail": "Review not found."}, status=status.HTTP_404_NOT_FOUND)
            return response.Response(ReviewSerializer(existing_review, context={"request": request}).data)

        if order.order_status != OrderStatus.DELIVERED:
            return response.Response(
                {"detail": "Only delivered orders can be reviewed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ReviewCreateSerializer(
            existing_review,
            data=request.data,
            partial=request.method == "PATCH",
            context={"request": request, "order": order},
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save(
            customer=request.user,
            restaurant=order.restaurant,
            order=order,
        )
        update_restaurant_rating(order.restaurant)
        response_status = status.HTTP_200_OK if existing_review else status.HTTP_201_CREATED
        return response.Response(
            ReviewSerializer(review, context={"request": request}).data,
            status=response_status,
        )


class RestaurantOwnerOrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = (IsRestaurantOwner,)
    filterset_fields = ("order_status", "payment_status", "restaurant")
    search_fields = ("id", "customer__email", "restaurant__name")
    ordering_fields = ("created_at", "total", "order_status")

    def get_queryset(self):
        primary_restaurant_id = get_primary_restaurant_id_for_owner(self.request.user)
        return (
            Order.objects.select_related("customer", "restaurant", "courier", "courier__courier_profile", "address", "delivery")
            .prefetch_related("items__product", "items__options", "events__actor", "events__courier")
            .filter(RESTAURANT_VISIBLE_ORDER_FILTER, restaurant__owner=self.request.user, restaurant_id=primary_restaurant_id)
        )

    @decorators.action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        order = self.get_object()
        serializer = RestaurantOwnerOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        previous_status = order.order_status
        order.order_status = serializer.validated_data["order_status"]
        if "restaurant_note" in serializer.validated_data:
            order.restaurant_note = serializer.validated_data["restaurant_note"]
        update_fields = ["order_status", "restaurant_note", "updated_at"]
        manual_assignment_removed = False
        latest_assignment = order.events.filter(event_type=OrderEvent.EventType.COURIER_ASSIGNED).first()
        if (
            order.courier_id
            and order.order_status in {OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP}
            and latest_assignment
            and latest_assignment.source == "restaurant"
        ):
            order.courier = None
            update_fields.append("courier")
            manual_assignment_removed = True
        order.save(update_fields=tuple(update_fields))
        if manual_assignment_removed:
            Delivery.objects.filter(order=order).delete()
            if order.order_status == OrderStatus.READY_FOR_PICKUP:
                from couriers.dispatch import dispatch_next_courier

                transaction.on_commit(lambda: dispatch_next_courier(order.id))
        if previous_status != order.order_status:
            log_order_status_changed(order, previous_status=previous_status, actor=request.user, source="restaurant")
            queue_order_status_push(order, previous_status=previous_status, source="restaurant")
        order.refresh_from_db()
        return response.Response(OrderSerializer(order, context={"request": request}).data)
