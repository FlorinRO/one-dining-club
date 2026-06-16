from rest_framework import serializers

from menus.models import ProductCategory
from restaurants.models import Restaurant
from restaurants.ownership import get_primary_restaurant_id_for_owner


class ProductCategorySerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return
        primary_restaurant_id = get_primary_restaurant_id_for_owner(request.user)
        self.fields["restaurant"].queryset = Restaurant.objects.filter(owner=request.user, id=primary_restaurant_id)

    class Meta:
        model = ProductCategory
        fields = ("id", "restaurant", "name", "sort_order", "is_active")
        read_only_fields = ("id",)
