from django.contrib import admin

from payments.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "provider", "provider_payment_id", "amount", "status", "created_at")
    list_filter = ("provider", "status", "created_at")
    search_fields = ("provider_payment_id", "order__id", "order__customer__email")
    autocomplete_fields = ("order",)

