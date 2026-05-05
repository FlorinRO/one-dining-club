from django.conf import settings
from django.db import models


class VehicleType(models.TextChoices):
    BIKE = "bike", "Bike"
    SCOOTER = "scooter", "Scooter"
    CAR = "car", "Car"
    WALK = "walk", "Walk"


class DeliveryStatus(models.TextChoices):
    ASSIGNED = "assigned", "Assigned"
    PICKED_UP = "picked_up", "Picked up"
    ON_THE_WAY = "on_the_way", "On the way"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"


class CourierProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="courier_profile")
    phone = models.CharField(max_length=32)
    vehicle_type = models.CharField(max_length=24, choices=VehicleType.choices, default=VehicleType.BIKE)
    current_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_available = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Courier profile for {self.user.email}"


class Delivery(models.Model):
    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="delivery")
    courier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="deliveries")
    pickup_time = models.DateTimeField(null=True, blank=True)
    delivered_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=32, choices=DeliveryStatus.choices, default=DeliveryStatus.ASSIGNED)
    distance_km = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ("-id",)
        verbose_name_plural = "Deliveries"

    def __str__(self):
        return f"Delivery for order #{self.order_id}"

