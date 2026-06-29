from django.contrib import admin

from products.models import Product, ProductComment, ProductOption, ProductOptionGroup


class ProductOptionInline(admin.TabularInline):
    model = ProductOption
    extra = 0


class ProductOptionGroupInline(admin.StackedInline):
    model = ProductOptionGroup
    extra = 0
    show_change_link = True


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "restaurant",
        "category",
        "price",
        "discount_price",
        "is_available",
        "is_popular",
        "preparation_time",
    )
    list_filter = ("restaurant", "category", "is_available", "is_popular")
    search_fields = ("name", "description", "restaurant__name")
    autocomplete_fields = ("restaurant", "category")
    inlines = (ProductOptionGroupInline,)


@admin.register(ProductOptionGroup)
class ProductOptionGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "product", "is_required", "min_select", "max_select")
    list_filter = ("is_required", "product__restaurant")
    search_fields = ("name", "product__name")
    autocomplete_fields = ("product",)
    inlines = (ProductOptionInline,)


@admin.register(ProductOption)
class ProductOptionAdmin(admin.ModelAdmin):
    list_display = ("name", "option_group", "extra_price", "is_available")
    list_filter = ("is_available", "option_group__product__restaurant")
    search_fields = ("name", "option_group__name", "option_group__product__name")
    autocomplete_fields = ("option_group",)


@admin.register(ProductComment)
class ProductCommentAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "user", "parent", "created_at", "updated_at")
    list_filter = ("created_at", "updated_at", "product__restaurant")
    search_fields = ("text", "user__email", "product__name", "product__restaurant__name")
    autocomplete_fields = ("product", "user", "parent")
