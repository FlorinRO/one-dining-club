from django.contrib import admin

from orders.models import Order, OrderEvent, OrderItem, OrderItemOption


class OrderItemOptionInline(admin.TabularInline):
    model = OrderItemOption
    extra = 0


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_name", "unit_price", "total_price")


class OrderEventInline(admin.TabularInline):
    model = OrderEvent
    extra = 0
    can_delete = False
    readonly_fields = ("event_type", "source", "actor", "courier", "previous_status", "next_status", "created_at")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer",
        "restaurant",
        "courier",
        "order_status",
        "payment_method",
        "payment_status",
        "total",
        "created_at",
    )
    list_filter = (
        "order_status",
        "payment_method",
        "payment_status",
        "restaurant",
        "created_at",
    )
    search_fields = ("id", "customer__email", "restaurant__name", "courier__email")
    autocomplete_fields = ("customer", "restaurant", "courier", "address")
    readonly_fields = ("subtotal", "delivery_fee", "discount", "total", "created_at", "updated_at")
    inlines = (OrderItemInline, OrderEventInline)


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "product_name", "quantity", "unit_price", "total_price")
    list_filter = ("order__restaurant",)
    search_fields = ("product_name", "order__id", "product__name")
    autocomplete_fields = ("order", "product")
    inlines = (OrderItemOptionInline,)


@admin.register(OrderItemOption)
class OrderItemOptionAdmin(admin.ModelAdmin):
    list_display = ("order_item", "option_name", "extra_price")
    search_fields = ("option_name", "order_item__product_name")
    autocomplete_fields = ("order_item",)


@admin.register(OrderEvent)
class OrderEventAdmin(admin.ModelAdmin):
    list_display = ("order", "event_type", "actor", "courier", "previous_status", "next_status", "created_at")
    list_filter = ("event_type", "source", "created_at")
    search_fields = ("order__id", "actor__email", "courier__email")
    autocomplete_fields = ("order", "actor", "courier")
    readonly_fields = ("created_at",)
