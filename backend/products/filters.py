import django_filters
from django.db.models import DecimalField
from django.db.models.functions import Coalesce

from products.models import Product


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(method="filter_min_price")
    max_price = django_filters.NumberFilter(method="filter_max_price")
    has_discount = django_filters.BooleanFilter(method="filter_has_discount")
    max_preparation_time = django_filters.NumberFilter(field_name="preparation_time", lookup_expr="lte")
    category_name = django_filters.CharFilter(field_name="category__name", lookup_expr="iexact")
    restaurant_city = django_filters.CharFilter(field_name="restaurant__city", lookup_expr="iexact")
    exclude_allergens = django_filters.CharFilter(method="filter_exclude_allergens")

    class Meta:
        model = Product
        fields = (
            "restaurant",
            "category",
            "is_available",
            "is_popular",
            "min_price",
            "max_price",
            "has_discount",
            "max_preparation_time",
            "category_name",
            "restaurant_city",
            "exclude_allergens",
        )

    def filter_min_price(self, queryset, name, value):
        return self._with_effective_price(queryset).filter(_effective_price__gte=value)

    def filter_max_price(self, queryset, name, value):
        return self._with_effective_price(queryset).filter(_effective_price__lte=value)

    def filter_has_discount(self, queryset, name, value):
        if value:
            return queryset.filter(discount_price__isnull=False)
        return queryset.filter(discount_price__isnull=True)

    def filter_exclude_allergens(self, queryset, name, value):
        allergens = [item.strip() for item in value.split(",") if item.strip()]
        for allergen in allergens:
            queryset = queryset.exclude(allergens__icontains=allergen)
        return queryset

    def _with_effective_price(self, queryset):
        return queryset.annotate(
            _effective_price=Coalesce(
                "discount_price",
                "price",
                output_field=DecimalField(max_digits=8, decimal_places=2),
            )
        )
