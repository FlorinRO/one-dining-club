import math
from decimal import Decimal, InvalidOperation

from django.db.models import Count, Q, Sum
from rest_framework import serializers

from menus.serializers import ProductCategorySerializer
from orders.models import OrderStatus
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
            "entity_type",
            "is_sponsored",
            "sponsored_mode",
            "website_url",
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


class RestaurantOwnerOpeningHoursSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = RestaurantOpeningHours
        fields = ("id", "day_of_week", "opening_time", "closing_time", "is_closed")

    def validate(self, attrs):
        is_closed = attrs.get("is_closed", getattr(self.instance, "is_closed", False))
        opening_time = attrs.get("opening_time", getattr(self.instance, "opening_time", None))
        closing_time = attrs.get("closing_time", getattr(self.instance, "closing_time", None))

        if not is_closed and (opening_time is None or closing_time is None):
            raise serializers.ValidationError("Opening and closing times are required when the day is open.")
        return attrs


class RestaurantOwnerSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(
        queryset=RestaurantCategory.objects.filter(is_active=True),
        many=True,
        required=False,
    )
    opening_hours = RestaurantOwnerOpeningHoursSerializer(many=True, required=False)
    categories_detail = RestaurantCategorySerializer(source="categories", many=True, read_only=True)

    class Meta:
        model = Restaurant
        fields = (
            "id",
            "owner",
            "name",
            "slug",
            "entity_type",
            "is_sponsored",
            "sponsored_mode",
            "website_url",
            "promo_video_url",
            "instagram_url",
            "tiktok_url",
            "description",
            "logo",
            "cover_image",
            "phone",
            "email",
            "address",
            "city",
            "latitude",
            "longitude",
            "delivery_fee",
            "minimum_order",
            "estimated_delivery_time_min",
            "estimated_delivery_time_max",
            "rating",
            "supports_pickup",
            "is_open",
            "is_active",
            "categories",
            "categories_detail",
            "opening_hours",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "owner", "slug", "rating", "created_at", "updated_at")

    def create(self, validated_data):
        categories = validated_data.pop("categories", [])
        opening_hours = validated_data.pop("opening_hours", [])
        restaurant = Restaurant.objects.create(owner=self.context["request"].user, **validated_data)
        if categories:
            restaurant.categories.set(categories)
        self._sync_opening_hours(restaurant, opening_hours)
        return restaurant

    def update(self, instance, validated_data):
        categories = validated_data.pop("categories", None)
        opening_hours = validated_data.pop("opening_hours", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if categories is not None:
            instance.categories.set(categories)
        if opening_hours is not None:
            self._sync_opening_hours(instance, opening_hours)
        return instance

    def _sync_opening_hours(self, restaurant, hours_payload):
        seen_days = set()
        for entry in hours_payload:
            hour_id = entry.pop("id", None)
            day_of_week = entry["day_of_week"]
            if day_of_week in seen_days:
                raise serializers.ValidationError({"opening_hours": "Each weekday can appear only once."})
            seen_days.add(day_of_week)

            defaults = {
                "day_of_week": day_of_week,
                "opening_time": entry.get("opening_time"),
                "closing_time": entry.get("closing_time"),
                "is_closed": entry.get("is_closed", False),
            }
            if hour_id:
                RestaurantOpeningHours.objects.filter(restaurant=restaurant, pk=hour_id).update(**defaults)
            else:
                RestaurantOpeningHours.objects.update_or_create(
                    restaurant=restaurant,
                    day_of_week=day_of_week,
                    defaults=defaults,
                )


class RestaurantOwnerOverviewSerializer(serializers.ModelSerializer):
    categories_detail = RestaurantCategorySerializer(source="categories", many=True, read_only=True)
    product_categories = ProductCategorySerializer(many=True, read_only=True)
    products_count = serializers.IntegerField(read_only=True)
    active_products_count = serializers.IntegerField(read_only=True)
    orders_count = serializers.IntegerField(read_only=True)
    pending_orders_count = serializers.IntegerField(read_only=True)
    delivered_orders_count = serializers.IntegerField(read_only=True)
    gross_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Restaurant
        fields = (
            "id",
            "name",
            "slug",
            "city",
            "is_open",
            "is_active",
            "logo",
            "cover_image",
            "promo_video_url",
            "categories_detail",
            "product_categories",
            "products_count",
            "active_products_count",
            "orders_count",
            "pending_orders_count",
            "delivered_orders_count",
            "gross_revenue",
        )

    @staticmethod
    def with_metrics(queryset):
        return queryset.annotate(
            products_count=Count("products", distinct=True),
            active_products_count=Count("products", filter=Q(products__is_available=True), distinct=True),
            orders_count=Count("orders", distinct=True),
            pending_orders_count=Count(
                "orders",
                filter=Q(
                    orders__order_status__in=(
                        OrderStatus.PENDING,
                        OrderStatus.ACCEPTED,
                        OrderStatus.PREPARING,
                        OrderStatus.READY_FOR_PICKUP,
                    )
                ),
                distinct=True,
            ),
            delivered_orders_count=Count(
                "orders",
                filter=Q(orders__order_status=OrderStatus.DELIVERED),
                distinct=True,
            ),
            gross_revenue=Sum("orders__total", filter=Q(orders__order_status=OrderStatus.DELIVERED)),
        )
