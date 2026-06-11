from rest_framework import serializers

from orders.models import OrderStatus
from reviews.models import Review


def display_name_for_user(user):
    if not user:
        return "user"
    if user.full_name:
        return user.full_name
    return user.email.split("@", 1)[0] if user.email else "user"


class ReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True)

    class Meta:
        model = Review
        fields = (
            "id",
            "customer",
            "customer_name",
            "restaurant",
            "restaurant_name",
            "order",
            "rating",
            "comment",
            "created_at",
        )
        read_only_fields = fields

    def get_customer_name(self, obj):
        return display_name_for_user(obj.customer)


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ("rating", "comment")

    def validate(self, attrs):
        order = self.context["order"]
        request = self.context["request"]

        if order.customer_id != request.user.id:
            raise serializers.ValidationError("You can review only your own orders.")
        if order.order_status != OrderStatus.DELIVERED:
            raise serializers.ValidationError("Only delivered orders can be reviewed.")
        return attrs
