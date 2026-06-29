from django.conf import settings
from django.db import models


class OrderStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    PREPARING = "preparing", "Preparing"
    READY_FOR_PICKUP = "ready_for_pickup", "Ready for pickup"
    PICKED_UP = "picked_up", "Picked up"
    ON_THE_WAY = "on_the_way", "On the way"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"
    REJECTED = "rejected", "Rejected"


class PaymentStatus(models.TextChoices):
    UNPAID = "unpaid", "Unpaid"
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Cash"
    CARD = "card", "Card"
    APPLE_PAY = "apple_pay", "Apple Pay"
    GOOGLE_PAY = "google_pay", "Google Pay"


class FulfillmentType(models.TextChoices):
    DELIVERY = "delivery", "Delivery"
    PICKUP = "pickup", "Pickup"


class Order(models.Model):
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    restaurant = models.ForeignKey("restaurants.Restaurant", on_delete=models.PROTECT, related_name="orders")
    courier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="courier_orders",
    )
    address = models.ForeignKey("addresses.Address", on_delete=models.PROTECT, related_name="orders", null=True, blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    fulfillment_type = models.CharField(max_length=24, choices=FulfillmentType.choices, default=FulfillmentType.DELIVERY)
    payment_method = models.CharField(max_length=24, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    payment_status = models.CharField(max_length=24, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    order_status = models.CharField(max_length=32, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    customer_note = models.TextField(blank=True)
    restaurant_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("customer", "-created_at")),
            models.Index(fields=("restaurant", "order_status")),
            models.Index(fields=("courier", "order_status")),
        ]

    def __str__(self):
        return f"Order #{self.id} - {self.restaurant.name}"

    @property
    def can_customer_cancel(self):
        return self.order_status in {OrderStatus.PENDING, OrderStatus.ACCEPTED}


class OrderEvent(models.Model):
    class EventType(models.TextChoices):
        CREATED = "created", "Created"
        STATUS_CHANGED = "status_changed", "Status changed"
        COURIER_ASSIGNED = "courier_assigned", "Courier assigned"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="events")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_events",
    )
    courier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_order_events",
    )
    event_type = models.CharField(max_length=32, choices=EventType.choices)
    source = models.CharField(max_length=32, blank=True)
    previous_status = models.CharField(max_length=32, blank=True)
    next_status = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [
            models.Index(fields=("order", "-created_at")),
        ]

    def __str__(self):
        return f"{self.get_event_type_display()} for order #{self.order_id}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("products.Product", on_delete=models.PROTECT, related_name="order_items")
    product_name = models.CharField(max_length=180)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("id",)

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"


class OrderItemOption(models.Model):
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name="options")
    option_name = models.CharField(max_length=140)
    extra_price = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    class Meta:
        ordering = ("id",)

    def __str__(self):
        return self.option_name
