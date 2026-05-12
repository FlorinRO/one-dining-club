import math
from decimal import Decimal, InvalidOperation

import django_filters

from restaurants.models import Restaurant


class NumberInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    pass


class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass


class RestaurantFilter(django_filters.FilterSet):
    city = django_filters.CharFilter(field_name="city", lookup_expr="iexact")
    category = NumberInFilter(field_name="categories", lookup_expr="in")
    categories = NumberInFilter(field_name="categories", lookup_expr="in")
    category_name = CharInFilter(method="filter_category_names")
    min_rating = django_filters.NumberFilter(field_name="rating", lookup_expr="gte")
    max_delivery_fee = django_filters.NumberFilter(field_name="delivery_fee", lookup_expr="lte")
    max_delivery_time = django_filters.NumberFilter(
        field_name="estimated_delivery_time_min",
        lookup_expr="lte",
    )
    min_order_lte = django_filters.NumberFilter(field_name="minimum_order", lookup_expr="lte")
    has_offer = django_filters.BooleanFilter(method="filter_has_offer")
    max_distance_km = django_filters.NumberFilter(method="filter_max_distance")

    class Meta:
        model = Restaurant
        fields = (
            "city",
            "is_open",
            "supports_pickup",
            "category",
            "categories",
            "category_name",
            "min_rating",
            "max_delivery_fee",
            "max_delivery_time",
            "min_order_lte",
            "has_offer",
            "max_distance_km",
        )

    def filter_category_names(self, queryset, name, values):
        clean_values = [value.strip() for value in values if value and value.strip()]
        if not clean_values:
            return queryset
        return queryset.filter(categories__name__in=clean_values).distinct()

    def filter_has_offer(self, queryset, name, value):
        lookup = {"products__is_available": True, "products__discount_price__isnull": False}
        if value:
            return queryset.filter(**lookup).distinct()
        return queryset.exclude(**lookup).distinct()

    def filter_max_distance(self, queryset, name, value):
        latitude = self._read_decimal("lat", "latitude")
        longitude = self._read_decimal("lng", "longitude")
        if latitude is None or longitude is None or value is None:
            return queryset

        distance_km = float(value)
        lat_delta = Decimal(str(distance_km / 111.32))
        cos_lat = abs(math.cos(math.radians(float(latitude)))) or 0.000001
        lng_delta = Decimal(str(distance_km / (111.32 * cos_lat)))

        return queryset.filter(
            latitude__isnull=False,
            longitude__isnull=False,
            latitude__gte=latitude - lat_delta,
            latitude__lte=latitude + lat_delta,
            longitude__gte=longitude - lng_delta,
            longitude__lte=longitude + lng_delta,
        )

    def _read_decimal(self, *keys):
        for key in keys:
            raw_value = self.data.get(key)
            if raw_value in (None, ""):
                continue
            try:
                return Decimal(str(raw_value))
            except (InvalidOperation, TypeError, ValueError):
                return None
        return None
