from rest_framework import serializers

from menus.models import ProductCategory
from products.models import Product, ProductOption, ProductOptionGroup
from restaurants.models import Restaurant


class ProductOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductOption
        fields = ("id", "name", "extra_price", "is_available")


class ProductOptionGroupSerializer(serializers.ModelSerializer):
    options = ProductOptionSerializer(many=True, read_only=True)

    class Meta:
        model = ProductOptionGroup
        fields = ("id", "name", "is_required", "min_select", "max_select", "options")


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True)
    effective_price = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    option_groups = ProductOptionGroupSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "restaurant",
            "restaurant_name",
            "category",
            "category_name",
            "name",
            "description",
            "image",
            "price",
            "discount_price",
            "effective_price",
            "is_available",
            "is_popular",
            "preparation_time",
            "allergens",
            "option_groups",
            "created_at",
            "updated_at",
        )


class RestaurantOwnerProductSerializer(serializers.ModelSerializer):
    restaurant_id = serializers.PrimaryKeyRelatedField(
        queryset=Restaurant.objects.none(),
        source="restaurant",
        write_only=True,
        required=False,
    )
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductCategory.objects.none(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "restaurant",
            "restaurant_id",
            "restaurant_name",
            "category",
            "category_id",
            "category_name",
            "name",
            "description",
            "image",
            "price",
            "discount_price",
            "is_available",
            "is_popular",
            "preparation_time",
            "allergens",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "restaurant", "category", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return
        restaurants = Restaurant.objects.filter(owner=request.user)
        self.fields["restaurant_id"].queryset = restaurants
        self.fields["category_id"].queryset = ProductCategory.objects.filter(restaurant__owner=request.user)

    def validate(self, attrs):
        restaurant = attrs.get("restaurant") or getattr(self.instance, "restaurant", None)
        category = attrs.get("category")

        if restaurant is None:
            restaurants = Restaurant.objects.filter(owner=self.context["request"].user)
            if restaurants.count() == 1:
                attrs["restaurant"] = restaurants.first()
            else:
                raise serializers.ValidationError({"restaurant_id": "Restaurant is required."})

        if category and category.restaurant_id != attrs.get("restaurant", restaurant).id:
            raise serializers.ValidationError({"category_id": "Category must belong to the selected restaurant."})
        return attrs

