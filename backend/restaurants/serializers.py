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
            "is_open",
            "categories",
        )


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

