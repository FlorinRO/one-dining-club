from rest_framework import serializers

from couriers.models import CourierProfile, VehicleType


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

    class Meta:
        model = CourierProfile
        fields = (
            "id",
            "full_name",
            "email",
            "phone",
            "vehicle_type",
            "current_latitude",
            "current_longitude",
            "is_available",
            "is_verified",
            "updated_at",
        )
        read_only_fields = ("id", "is_verified", "updated_at")


class CourierProfileUpdateSerializer(serializers.Serializer):
    phone = serializers.CharField(required=False, allow_blank=True, max_length=32)
    vehicle_type = serializers.ChoiceField(choices=VehicleType.choices, required=False)
    current_latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    current_longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    is_available = serializers.BooleanField(required=False)

    def validate(self, attrs):
        has_latitude = "current_latitude" in attrs
        has_longitude = "current_longitude" in attrs
        if has_latitude != has_longitude:
            raise serializers.ValidationError(
                "Both current_latitude and current_longitude are required when updating location."
            )
        return attrs
