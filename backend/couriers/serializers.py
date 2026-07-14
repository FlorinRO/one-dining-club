from django.utils import timezone
from rest_framework import serializers

from couriers.models import (
    CourierDocument,
    CourierDocumentType,
    CourierOperationEntry,
    CourierProfile,
    CourierSupportTicket,
    PreferredNavigationApp,
    VehicleType,
)
from orders.models import Order, OrderStatus


class RestaurantOwnerCourierSerializer(serializers.ModelSerializer):
    courier_id = serializers.IntegerField(source="user_id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return obj.user.full_name or obj.user.email

    class Meta:
        model = CourierProfile
        fields = (
            "courier_id",
            "email",
            "full_name",
            "phone",
            "vehicle_type",
            "current_latitude",
            "current_longitude",
            "is_available",
            "is_verified",
            "updated_at",
        )
        read_only_fields = fields


class CourierProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    member_since = serializers.DateTimeField(source="user.date_joined", read_only=True)
    avatar_url = serializers.SerializerMethodField()
    completed_deliveries_total = serializers.SerializerMethodField()

    class Meta:
        model = CourierProfile
        fields = (
            "id",
            "full_name",
            "email",
            "member_since",
            "avatar_url",
            "phone",
            "vehicle_type",
            "current_latitude",
            "current_longitude",
            "is_available",
            "is_verified",
            "app_notifications_enabled",
            "route_alerts_enabled",
            "preferred_navigation_app",
            "app_language",
            "rating_average",
            "rating_count",
            "completed_deliveries_total",
            "updated_at",
        )
        read_only_fields = ("id", "is_verified", "rating_average", "rating_count", "completed_deliveries_total", "updated_at")

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return ""
        url = obj.avatar.url
        request = self.context.get("request")
        if request and url.startswith("/"):
            return request.build_absolute_uri(url)
        return url

    def get_completed_deliveries_total(self, obj):
        delivered_orders = Order.objects.filter(courier=obj.user, order_status=OrderStatus.DELIVERED).count()
        simulated_deliveries = CourierOperationEntry.objects.filter(courier=obj.user).count()
        return delivered_orders + simulated_deliveries


class CourierProfileUpdateSerializer(serializers.Serializer):
    avatar = serializers.ImageField(required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=32)
    vehicle_type = serializers.ChoiceField(choices=VehicleType.choices, required=False)
    current_latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    current_longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    is_available = serializers.BooleanField(required=False)
    app_notifications_enabled = serializers.BooleanField(required=False)
    route_alerts_enabled = serializers.BooleanField(required=False)
    preferred_navigation_app = serializers.ChoiceField(choices=PreferredNavigationApp.choices, required=False)
    app_language = serializers.ChoiceField(choices=("ro", "en"), required=False)

    def validate(self, attrs):
        has_latitude = "current_latitude" in attrs
        has_longitude = "current_longitude" in attrs
        if has_latitude != has_longitude:
            raise serializers.ValidationError(
                "Both current_latitude and current_longitude are required when updating location."
            )
        return attrs


class CourierOperationEntrySerializer(serializers.ModelSerializer):
    reference_id = serializers.CharField(max_length=80)

    class Meta:
        model = CourierOperationEntry
        fields = ("id", "source", "reference_id", "completed_at", "delivery_fee", "distance_km", "duration_minutes", "metadata")
        read_only_fields = ("id", "source", "completed_at")

    def create(self, validated_data):
        return CourierOperationEntry.objects.update_or_create(
            courier=self.context["request"].user,
            source=CourierOperationEntry.SOURCE_SIMULATION,
            reference_id=validated_data["reference_id"],
            defaults={
                "completed_at": timezone.now(),
                "delivery_fee": validated_data.get("delivery_fee", 0),
                "distance_km": validated_data.get("distance_km", 0),
                "duration_minutes": validated_data.get("duration_minutes"),
                "metadata": validated_data.get("metadata", {}),
            },
        )[0]


class CourierDocumentSerializer(serializers.ModelSerializer):
    document_type_label = serializers.CharField(source="get_document_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = CourierDocument
        fields = (
            "id",
            "document_type",
            "document_type_label",
            "status",
            "status_label",
            "file_name",
            "review_note",
            "expires_at",
            "submitted_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "document_type_label",
            "status",
            "status_label",
            "review_note",
            "submitted_at",
            "updated_at",
        )

    def create(self, validated_data):
        document, _ = CourierDocument.objects.update_or_create(
            courier=self.context["request"].user,
            document_type=validated_data["document_type"],
            defaults={
                "file_name": validated_data.get("file_name", ""),
                "expires_at": validated_data.get("expires_at"),
                "status": "pending",
                "review_note": "",
            },
        )
        return document


class CourierSupportTicketSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = CourierSupportTicket
        fields = ("id", "subject", "message", "status", "status_label", "created_at", "updated_at")
        read_only_fields = ("id", "status", "status_label", "created_at", "updated_at")

    def create(self, validated_data):
        return CourierSupportTicket.objects.create(courier=self.context["request"].user, **validated_data)


def build_missing_document_payload(document_type):
    return {
        "id": None,
        "document_type": document_type.value,
        "document_type_label": document_type.label,
        "status": "missing",
        "status_label": "Missing",
        "file_name": "",
        "review_note": "",
        "expires_at": None,
        "submitted_at": None,
        "updated_at": None,
    }


def required_courier_document_types():
    return (
        CourierDocumentType.ID_CARD,
        CourierDocumentType.DRIVING_LICENSE,
        CourierDocumentType.VEHICLE_REGISTRATION,
        CourierDocumentType.INSURANCE,
    )
