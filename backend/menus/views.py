from rest_framework import serializers, viewsets

from core.permissions import IsRestaurantOwner
from menus.models import ProductCategory
from menus.serializers import ProductCategorySerializer
from restaurants.models import Restaurant
from restaurants.ownership import get_primary_restaurant_for_owner, get_primary_restaurant_id_for_owner


class RestaurantOwnerProductCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ProductCategorySerializer
    permission_classes = (IsRestaurantOwner,)
    filterset_fields = ("restaurant", "is_active")
    search_fields = ("name",)
    ordering_fields = ("sort_order", "name")

    def get_queryset(self):
        primary_restaurant_id = get_primary_restaurant_id_for_owner(self.request.user)
        return ProductCategory.objects.select_related("restaurant").filter(
            restaurant__owner=self.request.user,
            restaurant_id=primary_restaurant_id,
        )

    def perform_create(self, serializer):
        restaurant_id = self.request.data.get("restaurant")
        if not restaurant_id:
            primary_restaurant = get_primary_restaurant_for_owner(self.request.user)
            if primary_restaurant:
                serializer.save(restaurant=primary_restaurant)
                return
            raise serializers.ValidationError({"restaurant": "Restaurant is required."})
        try:
            primary_restaurant_id = get_primary_restaurant_id_for_owner(self.request.user)
            restaurant = Restaurant.objects.get(id=restaurant_id, owner=self.request.user, pk=primary_restaurant_id)
        except Restaurant.DoesNotExist as exc:
            raise serializers.ValidationError({"restaurant": "Restaurant not found."}) from exc
        serializer.save(restaurant=restaurant)
