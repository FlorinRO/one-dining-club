from wagtail import hooks
from wagtail.admin.ui.tables import UpdatedAtColumn
from wagtail.admin.viewsets.model import ModelViewSet, ModelViewSetGroup

from products.models import Product, ProductComment
from restaurants.forms import RestaurantAdminForm
from restaurants.models import Restaurant, RestaurantCategory
from reviews.models import Review


class RestaurantViewSet(ModelViewSet):
    model = Restaurant
    name = "restaurants"
    menu_label = "Restaurante"
    menu_icon = "home"
    icon = "home"
    list_display = (
        "name",
        "owner",
        "city",
        "is_active",
        "is_open",
        "supports_pickup",
        "rating",
        UpdatedAtColumn(),
    )
    list_filter = (
        "entity_type",
        "is_sponsored",
        "supports_pickup",
        "is_open",
        "is_active",
        "city",
    )
    search_fields = ("name", "owner__email", "city", "description", "email", "phone")
    search_backend_name = None
    ordering = ("name",)
    inspect_view_enabled = True

    def get_form_class(self, for_update=False):
        return RestaurantAdminForm


class RestaurantCategoryViewSet(ModelViewSet):
    model = RestaurantCategory
    name = "restaurant-categories"
    menu_label = "Categorii restaurante"
    menu_icon = "tag"
    icon = "tag"
    list_display = ("name", "icon", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)
    search_backend_name = None
    form_fields = ("name", "icon", "is_active")


class ProductViewSet(ModelViewSet):
    model = Product
    name = "products"
    menu_label = "Produse"
    menu_icon = "list-ul"
    icon = "list-ul"
    list_display = (
        "name",
        "restaurant",
        "category",
        "price",
        "discount_price",
        "is_available",
        "is_popular",
        UpdatedAtColumn(),
    )
    list_filter = ("restaurant", "category", "product_type", "is_available", "is_popular")
    search_fields = ("name", "restaurant__name", "category__name", "description", "ingredients")
    search_backend_name = None
    inspect_view_enabled = True
    form_fields = (
        "restaurant",
        "category",
        "name",
        "product_type",
        "description",
        "image",
        "price",
        "discount_price",
        "is_available",
        "is_popular",
        "preparation_time",
        "allergens",
        "ingredients",
        "ingredient_details",
        "calories",
        "audio_url",
        "has_audio",
        "video_url",
    )


class ProductCommentViewSet(ModelViewSet):
    model = ProductComment
    name = "product-comments"
    menu_label = "Comentarii produse"
    menu_icon = "comment"
    icon = "comment"
    list_display = ("product", "user", "parent", "created_at", UpdatedAtColumn())
    list_filter = ("product__restaurant", "product", "created_at")
    search_fields = ("text", "user__email", "product__name", "product__restaurant__name")
    search_backend_name = None
    inspect_view_enabled = True
    form_fields = ("product", "user", "parent", "text", "photo_urls")


class ReviewViewSet(ModelViewSet):
    model = Review
    name = "reviews"
    menu_label = "Review-uri"
    menu_icon = "star"
    icon = "star"
    list_display = ("restaurant", "customer", "order", "rating", "created_at")
    list_filter = ("restaurant", "rating", "created_at")
    search_fields = ("restaurant__name", "customer__email", "comment")
    search_backend_name = None
    inspect_view_enabled = True
    form_fields = ("customer", "restaurant", "order", "rating", "comment")


class MarketplaceViewSetGroup(ModelViewSetGroup):
    menu_label = "Marketplace"
    menu_icon = "folder-open-inverse"
    items = (
        RestaurantViewSet,
        RestaurantCategoryViewSet,
        ProductViewSet,
        ProductCommentViewSet,
        ReviewViewSet,
    )


@hooks.register("register_admin_viewset")
def register_marketplace_viewsets():
    return MarketplaceViewSetGroup()
