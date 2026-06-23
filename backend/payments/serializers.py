from rest_framework import serializers

from orders.serializers import OrderSerializer


class CheckoutResponseSerializer(serializers.Serializer):
    order = OrderSerializer()
    payment_sheet = serializers.DictField(required=False)
