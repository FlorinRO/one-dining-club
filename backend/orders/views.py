from rest_framework import decorators, permissions, response, status, viewsets

from core.permissions import IsCustomer, IsRestaurantOwner
from orders.models import Order, OrderStatus
from orders.serializers import (
    OrderCreateSerializer,
    OrderSerializer,
    RestaurantOwnerOrderStatusSerializer,
)


class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ("get", "post", "patch", "head", "options")

    def get_queryset(self):
        return (
            Order.objects.select_related("customer", "restaurant", "courier", "address")
            .prefetch_related("items__options")
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
        order.order_status = OrderStatus.CANCELLED
        order.save(update_fields=("order_status", "updated_at"))
        serializer = self.get_serializer(order)
        return response.Response(serializer.data)


class RestaurantOwnerOrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = (IsRestaurantOwner,)
    filterset_fields = ("order_status", "payment_status", "restaurant")
    search_fields = ("id", "customer__email", "restaurant__name")
    ordering_fields = ("created_at", "total", "order_status")

    def get_queryset(self):
        return (
            Order.objects.select_related("customer", "restaurant", "courier", "address")
            .prefetch_related("items__options")
            .filter(restaurant__owner=self.request.user)
        )

    @decorators.action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        order = self.get_object()
        serializer = RestaurantOwnerOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order.order_status = serializer.validated_data["order_status"]
        if "restaurant_note" in serializer.validated_data:
            order.restaurant_note = serializer.validated_data["restaurant_note"]
        order.save(update_fields=("order_status", "restaurant_note", "updated_at"))
        return response.Response(OrderSerializer(order, context={"request": request}).data)

