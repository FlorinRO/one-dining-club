from rest_framework import serializers, viewsets

from core.permissions import IsRestaurantOwner
from menus.models import ProductCategory
from menus.serializers import ProductCategorySerializer
from restaurants.models import Restaurant


class RestaurantOwnerProductCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ProductCategorySerializer
    permission_classes = (IsRestaurantOwner,)
    filterset_fields = ("restaurant", "is_active")
    search_fields = ("name",)
    ordering_fields = ("sort_order", "name")

    def get_queryset(self):
        return ProductCategory.objects.select_related("restaurant").filter(restaurant__owner=self.request.user)

    def perform_create(self, serializer):
        restaurant_id = self.request.data.get("restaurant")
        if not restaurant_id:
            owned_restaurants = Restaurant.objects.filter(owner=self.request.user)
            if owned_restaurants.count() == 1:
                serializer.save(restaurant=owned_restaurants.first())
                return
            raise serializers.ValidationError({"restaurant": "Restaurant is required."})
        try:
            restaurant = Restaurant.objects.get(id=restaurant_id, owner=self.request.user)
        except Restaurant.DoesNotExist as exc:
            raise serializers.ValidationError({"restaurant": "Restaurant not found."}) from exc
        serializer.save(restaurant=restaurant)
