from django.contrib import admin, messages
from django.db.models import Count, Q

from core.email import EmailDeliveryError
from restaurants.forms import RestaurantAdminForm
from restaurants.models import Restaurant, RestaurantCategory, RestaurantOpeningHours
from users.serializers import send_password_reset_email


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
    form = RestaurantAdminForm
    list_display = (
        "name",
        "entity_type",
        "is_sponsored",
        "sponsored_mode",
        "owner",
        "products_count",
        "available_products_count",
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
    actions = ("resend_setup_email",)

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("owner")
            .annotate(
                products_total=Count("products", distinct=True),
                available_products_total=Count("products", filter=Q(products__is_available=True), distinct=True),
            )
        )

    @admin.display(ordering="products_total", description="Produse")
    def products_count(self, obj):
        return getattr(obj, "products_total", 0)

    @admin.display(ordering="available_products_total", description="Produse active")
    def available_products_count(self, obj):
        return getattr(obj, "available_products_total", 0)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if getattr(form, "owner_was_created", False):
            self.message_user(
                request,
                f"A fost creat contul owner pentru {obj.owner.email}.",
                level=messages.SUCCESS,
            )
        if getattr(form, "setup_email_sent", False):
            self.message_user(
                request,
                f"Emailul de activare a fost trimis către {obj.owner.email}.",
                level=messages.SUCCESS,
            )
        if getattr(form, "setup_email_failed", False):
            self.message_user(
                request,
                f"Contul a fost creat, dar emailul de activare nu a putut fi trimis către {obj.owner.email}.",
                level=messages.WARNING,
            )

    @admin.action(description="Retrimite emailul de activare pentru restaurantele selectate")
    def resend_setup_email(self, request, queryset):
        sent = 0
        failed = 0
        for restaurant in queryset.select_related("owner"):
            if not restaurant.owner_id:
                continue
            try:
                send_password_reset_email(
                    restaurant.owner,
                    subject="Activează contul restaurantului în Yumzy",
                    headline="Activează contul restaurantului",
                    body=(
                        f"Contul pentru {restaurant.name} este pregătit. "
                        "Apasă pe butonul de mai jos pentru a seta parola și a intra în dashboard."
                    ),
                    button_label="Activează contul",
                    footnote="Dacă nu te așteptai la acest mesaj, contactează echipa Yumzy.",
                    intro_message=f"Contul restaurantului {restaurant.name} a fost creat în Yumzy.",
                )
                sent += 1
            except EmailDeliveryError:
                failed += 1
        self.message_user(request, f"Au fost trimise {sent} emailuri de activare.", level=messages.SUCCESS)
        if failed:
            self.message_user(
                request,
                f"{failed} emailuri nu au putut fi trimise.",
                level=messages.WARNING,
            )
