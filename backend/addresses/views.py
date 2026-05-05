from django.db import transaction
from rest_framework import decorators, permissions, response, status, viewsets

from addresses.models import Address
from addresses.serializers import AddressSerializer
from users.models import CustomerProfile


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ("get", "post", "patch", "delete", "head", "options")

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        should_be_default = serializer.validated_data.get("is_default") or not Address.objects.filter(
            user=self.request.user
        ).exists()
        if should_be_default:
            Address.objects.filter(user=self.request.user).update(is_default=False)
        address = serializer.save(user=self.request.user, is_default=should_be_default)
        if should_be_default:
            profile, _ = CustomerProfile.objects.get_or_create(user=self.request.user)
            profile.default_address = address
            profile.save(update_fields=("default_address",))

    @transaction.atomic
    def perform_update(self, serializer):
        should_be_default = serializer.validated_data.get("is_default")
        if should_be_default:
            Address.objects.filter(user=self.request.user).exclude(pk=self.get_object().pk).update(is_default=False)
        address = serializer.save()
        if address.is_default:
            profile, _ = CustomerProfile.objects.get_or_create(user=self.request.user)
            profile.default_address = address
            profile.save(update_fields=("default_address",))

    @decorators.action(detail=True, methods=["patch"], url_path="set-default")
    def set_default(self, request, pk=None):
        address = self.get_object()
        with transaction.atomic():
            Address.objects.filter(user=request.user).update(is_default=False)
            address.is_default = True
            address.save(update_fields=("is_default",))
            profile, _ = CustomerProfile.objects.get_or_create(user=request.user)
            profile.default_address = address
            profile.save(update_fields=("default_address",))
        serializer = self.get_serializer(address)
        return response.Response(serializer.data, status=status.HTTP_200_OK)

