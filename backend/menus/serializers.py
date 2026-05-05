from rest_framework import serializers

from menus.models import ProductCategory


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ("id", "restaurant", "name", "sort_order", "is_active")
        read_only_fields = ("id",)

