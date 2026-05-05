from django.contrib import admin

from couriers.models import CourierProfile, Delivery


@admin.register(CourierProfile)
class CourierProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone", "vehicle_type", "is_available", "is_verified", "updated_at")
    list_filter = ("vehicle_type", "is_available", "is_verified")
    search_fields = ("user__email", "phone")
    autocomplete_fields = ("user",)


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ("order", "courier", "status", "pickup_time", "delivered_time", "distance_km")
    list_filter = ("status", "pickup_time", "delivered_time")
    search_fields = ("order__id", "courier__email")
    autocomplete_fields = ("order", "courier")

