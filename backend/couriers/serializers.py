from rest_framework import serializers

from couriers.models import CourierProfile


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

