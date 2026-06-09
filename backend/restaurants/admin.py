from django.contrib import admin

from restaurants.models import Restaurant, RestaurantCategory, RestaurantOpeningHours


class RestaurantOpeningHoursInline(admin.TabularInline):
    model = RestaurantOpeningHours
    extra = 0


@admin.register(RestaurantCategory)
class RestaurantCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "entity_type",
        "is_sponsored",
        "sponsored_mode",
        "owner",
        "city",
        "rating",
        "delivery_fee",
        "minimum_order",
        "supports_pickup",
        "is_open",
        "is_active",
    )
    list_filter = ("entity_type", "is_sponsored", "sponsored_mode", "city", "supports_pickup", "is_open", "is_active", "categories")
    search_fields = ("name", "description", "address", "owner__email")
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("categories",)
    autocomplete_fields = ("owner",)
    inlines = (RestaurantOpeningHoursInline,)
