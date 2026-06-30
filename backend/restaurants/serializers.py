import logging
import math
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.conf import settings
from django.db.models import Count, Q, Sum
from rest_framework import serializers

from core.email import EmailDeliveryError, send_transactional_email
from menus.serializers import ProductCategorySerializer
from orders.models import OrderStatus, PaymentMethod, PaymentStatus
from restaurants.models import Restaurant, RestaurantApplication, RestaurantCategory, RestaurantOpeningHours
from restaurants.ownership import get_primary_restaurant_id_for_owner
from users.serializers import render_transactional_email

MAX_DELIVERY_FEE = Decimal("50.00")
MAX_MINIMUM_ORDER = Decimal("300.00")
MIN_DELIVERY_TIME_MINUTES = 10
MAX_DELIVERY_TIME_MINUTES = 180
IDENTITY_LOCKED_ERROR = "Numele și orașul pot fi completate o singură dată. Pentru modificări, contactează support@yumzy.ro."
COORDINATE_PRECISION = Decimal("0.000001")
logger = logging.getLogger(__name__)


class RestaurantCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantCategory
        fields = ("id", "name", "icon", "is_active")


class RestaurantApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantApplication
        fields = (
            "id",
            "contact_name",
            "contact_email",
            "contact_phone",
            "restaurant_name",
            "city",
            "address",
            "latitude",
            "longitude",
            "description",
            "cuisine_summary",
        )
        read_only_fields = ("id",)

    def validate_contact_email(self, value):
        return value.strip().lower()

    def create(self, validated_data):
        application = super().create(validated_data)
        self._notify_support(application)
        self._notify_applicant(application)
        return application

    def _notify_support(self, application):
        support_email = self.context["support_email"]
        try:
            send_transactional_email(
                subject=f"Cerere nouă restaurant Yumzy: {application.restaurant_name}",
                message=(
                    "A fost trimisă o nouă cerere de onboarding restaurant.\n\n"
                    f"Restaurant: {application.restaurant_name}\n"
                    f"Contact: {application.contact_name}\n"
                    f"Email: {application.contact_email}\n"
                    f"Telefon: {application.contact_phone}\n"
                    f"Oraș: {application.city}\n"
                    f"Adresă: {application.address}\n"
                    f"Latitudine: {application.latitude or '-'}\n"
                    f"Longitudine: {application.longitude or '-'}\n"
                    f"Cuisine: {application.cuisine_summary or '-'}\n"
                    f"Descriere: {application.description or '-'}\n"
                ),
                recipient_list=[support_email],
            )
            logger.info(
                "Restaurant application support email sent.",
                extra={
                    "restaurant_application_id": application.id,
                    "restaurant_name": application.restaurant_name,
                    "recipient": support_email,
                },
            )
        except EmailDeliveryError:
            logger.exception(
                "Restaurant application support email failed.",
                extra={
                    "restaurant_application_id": application.id,
                    "restaurant_name": application.restaurant_name,
                    "recipient": support_email,
                },
            )

    def _notify_applicant(self, application):
        try:
            send_transactional_email(
                subject="Am primit cererea restaurantului tău pe Yumzy",
                message=(
                    f"Salut {application.contact_name},\n\n"
                    f"Am primit cererea pentru {application.restaurant_name}.\n"
                    "Echipa Yumzy o va verifica și te va contacta dacă avem nevoie de clarificări.\n\n"
                    "După aprobare, vei primi un email separat cu linkul de activare al contului de restaurant.\n\n"
                    "Mulțumim,\nYumzy"
                ),
                html_message=render_transactional_email(
                    "users/emails/password_reset.html",
                    {
                        "headline": "Am primit cererea restaurantului",
                        "title_html": "cerere<br />primită",
                        "intro_text": f"Salut {application.contact_name}, am primit cererea pentru restaurantul tău.",
                        "body": (
                            f"Am înregistrat cererea pentru {application.restaurant_name}. "
                            "Echipa Yumzy o verifică și te contactează dacă avem nevoie de clarificări."
                        ),
                        "button_label": "Deschide Yumzy",
                        "button_url": settings.SITE_URL,
                        "footnote": "După aprobare, vei primi un email separat cu linkul de activare al contului de restaurant.",
                        "security_note": "Dacă nu ai trimis această cerere, contactează echipa Yumzy.",
                    },
                ),
                recipient_list=[application.contact_email],
            )
        except EmailDeliveryError:
            pass


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
            "created_at",
            "updated_at",
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
    identity_details_locked = serializers.SerializerMethodField(read_only=True)
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
            "identity_details_locked",
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

    def get_identity_details_locked(self, obj):
        return self._identity_details_locked(obj)

    def _identity_details_locked(self, restaurant):
        return bool(restaurant.pk and restaurant.name and restaurant.city and restaurant.address)

    def validate_delivery_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("Taxa de livrare nu poate fi negativă.")
        if value > MAX_DELIVERY_FEE:
            raise serializers.ValidationError(f"Taxa de livrare nu poate depăși {MAX_DELIVERY_FEE} RON.")
        return value

    def validate_minimum_order(self, value):
        if value < 0:
            raise serializers.ValidationError("Comanda minimă nu poate fi negativă.")
        if value > MAX_MINIMUM_ORDER:
            raise serializers.ValidationError(f"Comanda minimă nu poate depăși {MAX_MINIMUM_ORDER} RON.")
        return value

    def validate_estimated_delivery_time_min(self, value):
        if value < MIN_DELIVERY_TIME_MINUTES or value > MAX_DELIVERY_TIME_MINUTES:
            raise serializers.ValidationError(
                f"Timpul minim de livrare trebuie să fie între {MIN_DELIVERY_TIME_MINUTES} și {MAX_DELIVERY_TIME_MINUTES} minute."
            )
        return value

    def validate_estimated_delivery_time_max(self, value):
        if value < MIN_DELIVERY_TIME_MINUTES or value > MAX_DELIVERY_TIME_MINUTES:
            raise serializers.ValidationError(
                f"Timpul maxim de livrare trebuie să fie între {MIN_DELIVERY_TIME_MINUTES} și {MAX_DELIVERY_TIME_MINUTES} minute."
            )
        return value

    def validate_latitude(self, value):
        if value in (None, ""):
            return None
        normalized = Decimal(value).quantize(COORDINATE_PRECISION, rounding=ROUND_HALF_UP)
        if normalized < Decimal("-90") or normalized > Decimal("90"):
            raise serializers.ValidationError("Latitudinea trebuie să fie între -90 și 90.")
        return normalized

    def validate_longitude(self, value):
        if value in (None, ""):
            return None
        normalized = Decimal(value).quantize(COORDINATE_PRECISION, rounding=ROUND_HALF_UP)
        if normalized < Decimal("-180") or normalized > Decimal("180"):
            raise serializers.ValidationError("Longitudinea trebuie să fie între -180 și 180.")
        return normalized

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance and self._identity_details_locked(self.instance):
            identity_errors = {}
            for field in ("name", "city"):
                if field not in attrs:
                    continue
                if attrs[field] != getattr(self.instance, field):
                    identity_errors[field] = IDENTITY_LOCKED_ERROR
            if identity_errors:
                raise serializers.ValidationError(identity_errors)

        min_time = attrs.get("estimated_delivery_time_min", getattr(self.instance, "estimated_delivery_time_min", None))
        max_time = attrs.get("estimated_delivery_time_max", getattr(self.instance, "estimated_delivery_time_max", None))
        if min_time is not None and max_time is not None and min_time > max_time:
            raise serializers.ValidationError(
                {"estimated_delivery_time_max": "Timpul maxim de livrare trebuie să fie mai mare sau egal cu timpul minim."}
            )
        return attrs

    def create(self, validated_data):
        owner = self.context["request"].user
        if get_primary_restaurant_id_for_owner(owner):
            raise serializers.ValidationError({"restaurant": "This account already has a restaurant."})

        categories = validated_data.pop("categories", [])
        opening_hours = validated_data.pop("opening_hours", [])
        restaurant = Restaurant.objects.create(owner=owner, **validated_data)
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
        visible_orders_filter = Q(orders__payment_method=PaymentMethod.CASH) | Q(orders__payment_status=PaymentStatus.PAID)
        return queryset.annotate(
            products_count=Count("products", distinct=True),
            active_products_count=Count("products", filter=Q(products__is_available=True), distinct=True),
            orders_count=Count("orders", filter=visible_orders_filter, distinct=True),
            pending_orders_count=Count(
                "orders",
                filter=visible_orders_filter
                & Q(
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
                filter=visible_orders_filter & Q(orders__order_status=OrderStatus.DELIVERED),
                distinct=True,
            ),
            gross_revenue=Sum("orders__total", filter=visible_orders_filter & Q(orders__order_status=OrderStatus.DELIVERED)),
        )
