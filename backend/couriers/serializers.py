from rest_framework import serializers

from couriers.models import CourierProfile


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
    class Meta:
        model = CourierProfile
        fields = (
            "id",
            "phone",
            "vehicle_type",
            "current_latitude",
            "current_longitude",
            "is_available",
            "is_verified",
            "updated_at",
        )
        read_only_fields = ("id", "is_verified", "updated_at")


class CourierLocationSerializer(serializers.Serializer):
    current_latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    current_longitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    is_available = serializers.BooleanField(required=False)
