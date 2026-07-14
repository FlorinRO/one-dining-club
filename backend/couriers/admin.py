from django.contrib import admin

from couriers.models import CourierDispatchOffer, CourierDocument, CourierOperationEntry, CourierProfile, CourierSupportTicket, Delivery


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


@admin.register(CourierDispatchOffer)
class CourierDispatchOfferAdmin(admin.ModelAdmin):
    list_display = ("order", "courier", "status", "distance_km", "offered_at", "expires_at", "responded_at")
    list_filter = ("status", "offered_at")
    search_fields = ("order__id", "courier__email")
    autocomplete_fields = ("order", "courier")


@admin.register(CourierOperationEntry)
class CourierOperationEntryAdmin(admin.ModelAdmin):
    list_display = ("courier", "source", "reference_id", "delivery_fee", "distance_km", "completed_at")
    list_filter = ("source", "completed_at")
    search_fields = ("courier__email", "reference_id")
    autocomplete_fields = ("courier",)


@admin.register(CourierDocument)
class CourierDocumentAdmin(admin.ModelAdmin):
    list_display = ("courier", "document_type", "status", "expires_at", "updated_at")
    list_filter = ("document_type", "status")
    search_fields = ("courier__email", "file_name")
    autocomplete_fields = ("courier",)


@admin.register(CourierSupportTicket)
class CourierSupportTicketAdmin(admin.ModelAdmin):
    list_display = ("id", "courier", "subject", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("courier__email", "subject", "message")
    autocomplete_fields = ("courier",)
