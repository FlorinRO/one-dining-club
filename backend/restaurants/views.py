from rest_framework import decorators, permissions, response, viewsets

from menus.serializers import ProductCategorySerializer
from products.serializers import ProductSerializer
from restaurants.models import Restaurant
from restaurants.serializers import RestaurantDetailSerializer, RestaurantListSerializer


class RestaurantViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = (permissions.AllowAny,)
    lookup_field = "id"
    filterset_fields = ("city", "is_open", "categories")
    search_fields = ("name", "description", "city", "categories__name")
    ordering_fields = ("rating", "delivery_fee", "minimum_order", "estimated_delivery_time_min")
    ordering = ("name",)

    def get_queryset(self):
        return (
            Restaurant.objects.select_related("owner")
            .prefetch_related("categories", "opening_hours", "product_categories")
            .filter(is_active=True)
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

