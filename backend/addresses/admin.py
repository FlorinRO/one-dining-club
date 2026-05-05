from django.contrib import admin

from addresses.models import Address


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("label", "user", "city", "address_line_1", "is_default")
    list_filter = ("city", "is_default")
    search_fields = ("label", "full_name", "phone", "address_line_1", "user__email")
    autocomplete_fields = ("user",)

