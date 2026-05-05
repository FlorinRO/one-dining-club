from rest_framework import serializers

from addresses.models import Address


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = (
            "id",
            "label",
            "full_name",
            "phone",
            "address_line_1",
            "address_line_2",
            "city",
            "postcode",
            "latitude",
            "longitude",
            "instructions",
            "is_default",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

