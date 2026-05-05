from rest_framework import permissions, viewsets

from core.permissions import IsRestaurantOwner
from products.models import Product
from products.serializers import ProductSerializer, RestaurantOwnerProductSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = (permissions.AllowAny,)
    filterset_fields = ("restaurant", "category", "is_available", "is_popular")
    search_fields = ("name", "description", "restaurant__name", "allergens")
    ordering_fields = ("name", "price", "created_at", "preparation_time")
    ordering = ("category__sort_order", "name")

    def get_queryset(self):
        return (
            Product.objects.select_related("restaurant", "category")
            .prefetch_related("option_groups__options")
            .filter(restaurant__is_active=True)
        )


class RestaurantOwnerProductViewSet(viewsets.ModelViewSet):
    serializer_class = RestaurantOwnerProductSerializer
    permission_classes = (IsRestaurantOwner,)
    http_method_names = ("get", "post", "patch", "head", "options")
    filterset_fields = ("restaurant", "category", "is_available", "is_popular")
    search_fields = ("name", "description")
    ordering_fields = ("name", "price", "created_at", "updated_at")

    def get_queryset(self):
        return Product.objects.select_related("restaurant", "category").filter(
            restaurant__owner=self.request.user
        )

