from wagtail import hooks
from wagtail.admin.ui.tables import UpdatedAtColumn
from wagtail.admin.viewsets.model import ModelViewSet, ModelViewSetGroup

from addresses.models import Address
from couriers.models import CourierProfile, Delivery
from menus.models import ProductCategory
from orders.models import Order, OrderEvent, OrderItem, OrderItemOption
from payments.models import Payment
from products.models import Product, ProductComment
from restaurants.forms import RestaurantAdminForm
from restaurants.models import Restaurant, RestaurantApplication, RestaurantCategory
from reviews.models import Review
from users.models import CustomerProfile, PushDevice, SocialAccount, User


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


class ProductCategoryViewSet(ModelViewSet):
    model = ProductCategory
    name = "product-categories"
    menu_label = "Categorii produse"
    menu_icon = "folder-open-1"
    icon = "folder-open-1"
    list_display = ("name", "restaurant", "sort_order", "is_active")
    list_filter = ("restaurant", "is_active")
    search_fields = ("name", "restaurant__name")
    search_backend_name = None
    form_fields = ("restaurant", "name", "sort_order", "is_active")


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


class RestaurantApplicationViewSet(ModelViewSet):
    model = RestaurantApplication
    name = "restaurant-applications"
    menu_label = "Cereri restaurante"
    menu_icon = "mail"
    icon = "mail"
    list_display = (
        "restaurant_name",
        "contact_name",
        "contact_email",
        "city",
        "status",
        "created_restaurant",
        "created_at",
    )
    list_filter = ("status", "city", "created_at")
    search_fields = ("restaurant_name", "contact_name", "contact_email", "contact_phone", "city")
    search_backend_name = None
    inspect_view_enabled = True
    form_fields = (
        "contact_name",
        "contact_email",
        "contact_phone",
        "restaurant_name",
        "city",
        "address",
        "latitude",
        "longitude",
        "description",
        "cuisine_summary",
        "status",
        "reviewed_by",
    )


class UserViewSet(ModelViewSet):
    model = User
    name = "users"
    menu_label = "Utilizatori"
    menu_icon = "user"
    icon = "user"
    list_display = ("email", "first_name", "last_name", "phone", "role", "is_active", "is_staff", "date_joined")
    list_filter = ("role", "is_active", "is_staff", "date_joined")
    search_fields = ("email", "phone", "first_name", "last_name")
    search_backend_name = None
    inspect_view_enabled = True
    form_fields = (
        "email",
        "phone",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "is_staff",
        "is_superuser",
        "groups",
        "user_permissions",
    )


class CustomerProfileViewSet(ModelViewSet):
    model = CustomerProfile
    name = "customer-profiles"
    menu_label = "Profiluri clienți"
    menu_icon = "group"
    icon = "group"
    list_display = ("user", "phone_number", "default_address")
    search_fields = ("user__email", "phone_number")
    search_backend_name = None
    form_fields = ("user", "default_address", "phone_number")


class SocialAccountViewSet(ModelViewSet):
    model = SocialAccount
    name = "social-accounts"
    menu_label = "Conturi social"
    menu_icon = "link"
    icon = "link"
    list_display = ("user", "provider", "subject", "created_at")
    list_filter = ("provider",)
    search_fields = ("user__email", "subject")
    search_backend_name = None
    form_fields = ("user", "provider", "subject")


class PushDeviceViewSet(ModelViewSet):
    model = PushDevice
    name = "push-devices"
    menu_label = "Device-uri push"
    menu_icon = "mobile-android"
    icon = "mobile-android"
    list_display = ("user", "platform", "device_id", "is_active", "app_version", "last_registered_at")
    list_filter = ("platform", "is_active", "last_registered_at")
    search_fields = ("user__email", "expo_push_token", "device_id")
    search_backend_name = None
    form_fields = ("user", "expo_push_token", "platform", "device_id", "app_version", "is_active")


class AddressViewSet(ModelViewSet):
    model = Address
    name = "addresses"
    menu_label = "Adrese"
    menu_icon = "site"
    icon = "site"
    list_display = ("label", "user", "city", "address_line_1", "is_default", UpdatedAtColumn())
    list_filter = ("city", "is_default")
    search_fields = ("label", "full_name", "phone", "address_line_1", "user__email")
    search_backend_name = None
    inspect_view_enabled = True
    form_fields = (
        "user",
        "label",
        "full_name",
        "phone",
        "address_line_1",
        "address_line_2",
        "city",
        "postcode",
        "latitude",
        "longitude",
        "instructions",
        "is_default",
    )


class OrderViewSet(ModelViewSet):
    model = Order
    name = "orders"
    menu_label = "Comenzi"
    menu_icon = "doc-full-inverse"
    icon = "doc-full-inverse"
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
    list_filter = ("order_status", "payment_method", "payment_status", "restaurant", "created_at")
    search_fields = ("id", "customer__email", "restaurant__name", "courier__email")
    search_backend_name = None
    inspect_view_enabled = True
    form_fields = (
        "customer",
        "restaurant",
        "courier",
        "address",
        "subtotal",
        "delivery_fee",
        "discount",
        "total",
        "fulfillment_type",
        "payment_method",
        "payment_status",
        "order_status",
        "customer_note",
        "restaurant_note",
    )


class OrderItemViewSet(ModelViewSet):
    model = OrderItem
    name = "order-items"
    menu_label = "Linii comandă"
    menu_icon = "tasks"
    icon = "tasks"
    list_display = ("order", "product_name", "quantity", "unit_price", "total_price")
    list_filter = ("order__restaurant",)
    search_fields = ("product_name", "order__id", "product__name")
    search_backend_name = None
    form_fields = ("order", "product", "product_name", "quantity", "unit_price", "total_price", "notes")


class OrderItemOptionViewSet(ModelViewSet):
    model = OrderItemOption
    name = "order-item-options"
    menu_label = "Opțiuni comandă"
    menu_icon = "plus-inverse"
    icon = "plus-inverse"
    list_display = ("order_item", "option_name", "extra_price")
    search_fields = ("option_name", "order_item__product_name")
    search_backend_name = None
    form_fields = ("order_item", "option_name", "extra_price")


class OrderEventViewSet(ModelViewSet):
    model = OrderEvent
    name = "order-events"
    menu_label = "Istoric comenzi"
    menu_icon = "history"
    icon = "history"
    list_display = ("order", "event_type", "actor", "courier", "previous_status", "next_status", "created_at")
    list_filter = ("event_type", "source", "created_at")
    search_fields = ("order__id", "actor__email", "courier__email")
    search_backend_name = None
    form_fields = ("order", "actor", "courier", "event_type", "source", "previous_status", "next_status")


class PaymentViewSet(ModelViewSet):
    model = Payment
    name = "payments"
    menu_label = "Plăți"
    menu_icon = "pick"
    icon = "pick"
    list_display = ("order", "provider", "provider_payment_id", "amount", "status", "created_at")
    list_filter = ("provider", "status", "created_at")
    search_fields = ("provider_payment_id", "order__id", "order__customer__email")
    search_backend_name = None
    form_fields = ("order", "provider", "provider_payment_id", "amount", "status")


class CourierProfileViewSet(ModelViewSet):
    model = CourierProfile
    name = "courier-profiles"
    menu_label = "Curieri"
    menu_icon = "user"
    icon = "user"
    list_display = ("user", "phone", "vehicle_type", "is_available", "is_verified", UpdatedAtColumn())
    list_filter = ("vehicle_type", "is_available", "is_verified")
    search_fields = ("user__email", "phone")
    search_backend_name = None
    form_fields = (
        "user",
        "phone",
        "vehicle_type",
        "current_latitude",
        "current_longitude",
        "is_available",
        "is_verified",
    )


class DeliveryViewSet(ModelViewSet):
    model = Delivery
    name = "deliveries"
    menu_label = "Livrări"
    menu_icon = "redirect"
    icon = "redirect"
    list_display = ("order", "courier", "status", "pickup_time", "delivered_time", "distance_km")
    list_filter = ("status", "pickup_time", "delivered_time")
    search_fields = ("order__id", "courier__email")
    search_backend_name = None
    form_fields = ("order", "courier", "pickup_time", "delivered_time", "status", "distance_km")


class MarketplaceViewSetGroup(ModelViewSetGroup):
    menu_label = "Marketplace"
    menu_icon = "folder-open-inverse"
    items = (
        RestaurantViewSet,
        RestaurantCategoryViewSet,
        RestaurantApplicationViewSet,
        ProductCategoryViewSet,
        ProductViewSet,
        ProductCommentViewSet,
        ReviewViewSet,
    )


class OperationsViewSetGroup(ModelViewSetGroup):
    menu_label = "Operațiuni"
    menu_icon = "form"
    items = (
        OrderViewSet,
        OrderItemViewSet,
        OrderItemOptionViewSet,
        OrderEventViewSet,
        PaymentViewSet,
        DeliveryViewSet,
    )


class UsersViewSetGroup(ModelViewSetGroup):
    menu_label = "Utilizatori"
    menu_icon = "group"
    items = (
        UserViewSet,
        CustomerProfileViewSet,
        SocialAccountViewSet,
        PushDeviceViewSet,
        AddressViewSet,
        CourierProfileViewSet,
    )


@hooks.register("register_admin_viewset")
def register_backoffice_viewsets():
    return [
        MarketplaceViewSetGroup(),
        OperationsViewSetGroup(),
        UsersViewSetGroup(),
    ]
