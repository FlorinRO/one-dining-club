from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from users.models import CustomerProfile, PushDevice, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("-date_joined",)
    list_display = ("email", "first_name", "last_name", "phone", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff", "date_joined")
    search_fields = ("email", "phone", "first_name", "last_name")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "phone", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "role", "is_staff", "is_superuser"),
            },
        ),
    )


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone_number", "default_address")
    search_fields = ("user__email", "phone_number")
    autocomplete_fields = ("user", "default_address")


@admin.register(PushDevice)
class PushDeviceAdmin(admin.ModelAdmin):
    list_display = ("user", "platform", "is_active", "app_version", "last_registered_at")
    list_filter = ("platform", "is_active", "last_registered_at")
    search_fields = ("user__email", "expo_push_token", "device_id")
    autocomplete_fields = ("user",)
