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
        "owner",
        "city",
        "rating",
        "delivery_fee",
        "minimum_order",
        "is_open",
        "is_active",
    )
    list_filter = ("city", "is_open", "is_active", "categories")
    search_fields = ("name", "description", "address", "owner__email")
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("categories",)
    autocomplete_fields = ("owner",)
    inlines = (RestaurantOpeningHoursInline,)

