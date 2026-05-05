from django.contrib import admin

from reviews.models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("restaurant", "customer", "order", "rating", "created_at")
    list_filter = ("rating", "created_at", "restaurant")
    search_fields = ("comment", "customer__email", "restaurant__name", "order__id")
    autocomplete_fields = ("customer", "restaurant", "order")

