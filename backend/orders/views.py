from rest_framework import decorators, permissions, response, status, viewsets

from core.permissions import IsCustomer, IsRestaurantOwner
from orders.models import Order, OrderStatus
from orders.serializers import (
    OrderCreateSerializer,
    OrderSerializer,
    RestaurantOwnerOrderStatusSerializer,
)
from reviews.models import update_restaurant_rating
from reviews.serializers import ReviewCreateSerializer, ReviewSerializer


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
