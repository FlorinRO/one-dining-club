from django.utils import timezone
from rest_framework import decorators, response, status, views, viewsets

from core.permissions import IsCourier
from couriers.models import CourierProfile, Delivery, DeliveryStatus
from couriers.serializers import CourierLocationSerializer, CourierProfileSerializer
from orders.models import Order, OrderStatus
from orders.serializers import CourierOrderStatusSerializer, OrderSerializer


class CourierOrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = (IsCourier,)
    filterset_fields = ("order_status",)
    ordering_fields = ("created_at", "total")

    def get_queryset(self):
        return (
            Order.objects.select_related("customer", "restaurant", "courier", "address")
            .prefetch_related("items__options")
            .filter(order_status=OrderStatus.READY_FOR_PICKUP, courier__isnull=True)
            | Order.objects.select_related("customer", "restaurant", "courier", "address")
            .prefetch_related("items__options")
            .filter(courier=self.request.user)
        )

    @decorators.action(detail=True, methods=["patch"])
    def accept(self, request, pk=None):
        order = self.get_object()
        if order.courier_id and order.courier_id != request.user.id:
            return response.Response({"detail": "Order already assigned."}, status=status.HTTP_400_BAD_REQUEST)
        if order.order_status != OrderStatus.READY_FOR_PICKUP:
            return response.Response({"detail": "Order is not ready for pickup."}, status=status.HTTP_400_BAD_REQUEST)

        order.courier = request.user
        order.order_status = OrderStatus.PICKED_UP
        order.save(update_fields=("courier", "order_status", "updated_at"))
        Delivery.objects.get_or_create(
            order=order,
            defaults={
                "courier": request.user,
                "pickup_time": timezone.now(),
                "status": DeliveryStatus.PICKED_UP,
            },
        )
        return response.Response(OrderSerializer(order, context={"request": request}).data)

    @decorators.action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        order = self.get_object()
        if order.courier_id != request.user.id:
            return response.Response({"detail": "Order is not assigned to you."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CourierOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order.order_status = serializer.validated_data["order_status"]
        order.save(update_fields=("order_status", "updated_at"))

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
        return response.Response(OrderSerializer(order, context={"request": request}).data)


class CourierProfileView(views.APIView):
    permission_classes = (IsCourier,)

    def patch(self, request):
        serializer = CourierLocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile, _ = CourierProfile.objects.get_or_create(
            user=request.user,
            defaults={"phone": request.user.phone or ""},
        )
        for field, value in serializer.validated_data.items():
            setattr(profile, field, value)
        profile.save()
        return response.Response(CourierProfileSerializer(profile).data)

