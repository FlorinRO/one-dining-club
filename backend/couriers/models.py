from django.conf import settings
from django.db import models


class VehicleType(models.TextChoices):
    BIKE = "bike", "Bike"
    SCOOTER = "scooter", "Scooter"
    CAR = "car", "Car"
    WALK = "walk", "Walk"


class PreferredNavigationApp(models.TextChoices):
    GOOGLE_MAPS = "google_maps", "Google Maps"
    APPLE_MAPS = "apple_maps", "Apple Maps"
    WAZE = "waze", "Waze"


class DeliveryStatus(models.TextChoices):
    ASSIGNED = "assigned", "Assigned"
    PICKED_UP = "picked_up", "Picked up"
    ON_THE_WAY = "on_the_way", "On the way"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"


class CourierDocumentType(models.TextChoices):
    ID_CARD = "id_card", "Identity card"
    DRIVING_LICENSE = "driving_license", "Driving license"
    VEHICLE_REGISTRATION = "vehicle_registration", "Vehicle registration"
    INSURANCE = "insurance", "Insurance"


class CourierDocumentStatus(models.TextChoices):
    MISSING = "missing", "Missing"
    PENDING = "pending", "Pending review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class CourierSupportTicketStatus(models.TextChoices):
    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In progress"
    CLOSED = "closed", "Closed"


class CourierProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="courier_profile")
    phone = models.CharField(max_length=32)
    vehicle_type = models.CharField(max_length=24, choices=VehicleType.choices, default=VehicleType.BIKE)
    current_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_available = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    app_notifications_enabled = models.BooleanField(default=True)
    route_alerts_enabled = models.BooleanField(default=True)
    preferred_navigation_app = models.CharField(
        max_length=24,
        choices=PreferredNavigationApp.choices,
        default=PreferredNavigationApp.GOOGLE_MAPS,
    )
    app_language = models.CharField(max_length=8, default="ro")
    rating_average = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    rating_count = models.PositiveIntegerField(default=0)
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


class CourierAvailabilitySession(models.Model):
    courier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="availability_sessions")
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-started_at", "-id")
        indexes = [
            models.Index(fields=("courier", "started_at")),
            models.Index(fields=("courier", "ended_at")),
        ]

    def __str__(self):
        return f"Availability session for {self.courier_id} from {self.started_at}"


class CourierOperationEntry(models.Model):
    SOURCE_SIMULATION = "simulation"

    courier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="operation_entries")
    source = models.CharField(max_length=32, default=SOURCE_SIMULATION)
    reference_id = models.CharField(max_length=80, blank=True)
    completed_at = models.DateTimeField()
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    distance_km = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-completed_at", "-id")
        indexes = [
            models.Index(fields=("courier", "completed_at")),
            models.Index(fields=("courier", "source")),
        ]
        constraints = [
            models.UniqueConstraint(fields=("courier", "source", "reference_id"), name="unique_courier_operation_reference"),
        ]

    def __str__(self):
        return f"Operation entry for {self.courier_id} at {self.completed_at}"


class CourierDocument(models.Model):
    courier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="courier_documents")
    document_type = models.CharField(max_length=32, choices=CourierDocumentType.choices)
    status = models.CharField(max_length=24, choices=CourierDocumentStatus.choices, default=CourierDocumentStatus.PENDING)
    file_name = models.CharField(max_length=255, blank=True)
    review_note = models.TextField(blank=True)
    expires_at = models.DateField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("document_type",)
        constraints = [
            models.UniqueConstraint(fields=("courier", "document_type"), name="unique_courier_document_type"),
        ]

    def __str__(self):
        return f"{self.get_document_type_display()} for {self.courier_id}"


class CourierSupportTicket(models.Model):
    courier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="courier_support_tickets")
    subject = models.CharField(max_length=160)
    message = models.TextField()
    status = models.CharField(max_length=24, choices=CourierSupportTicketStatus.choices, default=CourierSupportTicketStatus.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [
            models.Index(fields=("courier", "status")),
            models.Index(fields=("courier", "created_at")),
        ]

    def __str__(self):
        return f"Support ticket #{self.id} for {self.courier_id}"
