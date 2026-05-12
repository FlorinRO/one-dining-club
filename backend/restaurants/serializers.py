import math
from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from menus.serializers import ProductCategorySerializer
from restaurants.models import Restaurant, RestaurantCategory, RestaurantOpeningHours


class RestaurantCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantCategory
        fields = ("id", "name", "icon", "is_active")


class RestaurantOpeningHoursSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = RestaurantOpeningHours
        fields = ("id", "day_of_week", "day_name", "opening_time", "closing_time", "is_closed")


class RestaurantListSerializer(serializers.ModelSerializer):
    categories = RestaurantCategorySerializer(many=True, read_only=True)
    reviews_count = serializers.IntegerField(read_only=True)
    has_offer = serializers.BooleanField(read_only=True)
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = Restaurant
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "logo",
            "cover_image",
            "city",
            "delivery_fee",
            "minimum_order",
            "estimated_delivery_time_min",
            "estimated_delivery_time_max",
            "rating",
            "reviews_count",
            "has_offer",
            "supports_pickup",
            "distance_km",
            "is_open",
            "categories",
        )

    def get_distance_km(self, obj):
        request = self.context.get("request")
        if not request or obj.latitude is None or obj.longitude is None:
            return None

        latitude = self._read_decimal(request, "lat", "latitude")
        longitude = self._read_decimal(request, "lng", "longitude")
        if latitude is None or longitude is None:
            return None

        return round(self._distance_km(latitude, longitude, obj.latitude, obj.longitude), 2)

    def _read_decimal(self, request, *keys):
        for key in keys:
            raw_value = request.query_params.get(key)
            if raw_value in (None, ""):
                continue
            try:
                return Decimal(str(raw_value))
            except (InvalidOperation, TypeError, ValueError):
                return None
        return None

    def _distance_km(self, start_lat, start_lng, end_lat, end_lng):
        start_lat_rad = math.radians(float(start_lat))
        end_lat_rad = math.radians(float(end_lat))
        lat_delta = math.radians(float(end_lat - start_lat))
        lng_delta = math.radians(float(end_lng - start_lng))

        haversine = (
            math.sin(lat_delta / 2) ** 2
            + math.cos(start_lat_rad) * math.cos(end_lat_rad) * math.sin(lng_delta / 2) ** 2
        )
        return 6371 * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))


class RestaurantDetailSerializer(RestaurantListSerializer):
    opening_hours = RestaurantOpeningHoursSerializer(many=True, read_only=True)
    product_categories = ProductCategorySerializer(many=True, read_only=True)

    class Meta(RestaurantListSerializer.Meta):
        fields = RestaurantListSerializer.Meta.fields + (
            "phone",
            "email",
            "address",
            "latitude",
            "longitude",
            "opening_hours",
            "product_categories",
            "created_at",
            "updated_at",
        )
