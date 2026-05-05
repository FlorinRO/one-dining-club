from django.contrib import admin

from menus.models import ProductCategory


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "restaurant", "sort_order", "is_active")
    list_filter = ("restaurant", "is_active")
    search_fields = ("name", "restaurant__name")
    autocomplete_fields = ("restaurant",)

