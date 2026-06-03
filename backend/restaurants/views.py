from django.db.models import Count, Exists, OuterRef
from rest_framework import decorators, permissions, response, viewsets

from menus.serializers import ProductCategorySerializer
from products.models import Product
from products.serializers import ProductSerializer
from restaurants.filters import RestaurantFilter
from restaurants.models import Restaurant, RestaurantCategory
from restaurants.serializers import (
    RestaurantCategorySerializer,
    RestaurantDetailSerializer,
    RestaurantListSerializer,
)


class RestaurantCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RestaurantCategorySerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = None
    search_fields = ("name",)
    ordering_fields = ("name",)
    ordering = ("name",)

    def get_queryset(self):
        return RestaurantCategory.objects.filter(is_active=True)


class RestaurantViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = (permissions.AllowAny,)
    lookup_field = "id"
    filterset_class = RestaurantFilter
    search_fields = ("name", "description", "city", "categories__name")
    ordering_fields = (
        "rating",
        "delivery_fee",
        "minimum_order",
        "estimated_delivery_time_min",
        "reviews_count",
    )
    ordering = ("name",)

    def get_queryset(self):
        offer_products = Product.objects.filter(
            restaurant=OuterRef("pk"),
            is_available=True,
            discount_price__isnull=False,
        )
        return (
            Restaurant.objects.select_related("owner")
            .prefetch_related("categories", "opening_hours", "product_categories")
            .filter(is_active=True)
            .annotate(
                reviews_count=Count("reviews", distinct=True),
                has_offer=Exists(offer_products),
            )
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return RestaurantDetailSerializer
        return RestaurantListSerializer

    @decorators.action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def products(self, request, id=None):
        restaurant = self.get_object()
        products = (
            restaurant.products.select_related("category", "restaurant")
            .prefetch_related("option_groups__options")
            .filter(is_available=True)
            .order_by("id")
        )
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        serializer = ProductSerializer(products, many=True, context={"request": request})
        return response.Response(serializer.data)

    @decorators.action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def categories(self, request, id=None):
        restaurant = self.get_object()
        categories = restaurant.product_categories.filter(is_active=True)
        serializer = ProductCategorySerializer(categories, many=True, context={"request": request})
        return response.Response(serializer.data)
