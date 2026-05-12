from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from addresses.views import AddressViewSet
from couriers.views import CourierOrderViewSet, CourierProfileView
from orders.views import OrderViewSet, RestaurantOwnerOrderViewSet
from products.views import ProductViewSet, RestaurantOwnerProductViewSet
from restaurants.views import RestaurantCategoryViewSet, RestaurantViewSet
from users.views import (
    EmailVerificationConfirmView,
    EmailVerificationRequestView,
    LoginView,
    LogoutView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    SocialLoginView,
)


router = DefaultRouter()
router.register("restaurant-categories", RestaurantCategoryViewSet, basename="restaurant-category")
router.register("restaurants", RestaurantViewSet, basename="restaurant")
router.register("products", ProductViewSet, basename="product")
router.register("addresses", AddressViewSet, basename="address")
router.register("orders", OrderViewSet, basename="order")
router.register(
    "restaurant-owner/orders",
    RestaurantOwnerOrderViewSet,
    basename="restaurant-owner-order",
)
router.register(
    "restaurant-owner/products",
    RestaurantOwnerProductViewSet,
    basename="restaurant-owner-product",
)
router.register("courier/orders", CourierOrderViewSet, basename="courier-order")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view(), name="auth-register"),
    path("api/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("api/auth/social/", SocialLoginView.as_view(), name="auth-social"),
    path("api/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/auth/me/", MeView.as_view(), name="auth-me"),
    path("api/auth/verify-email/confirm/", EmailVerificationConfirmView.as_view(), name="auth-email-verify-confirm"),
    path("api/auth/verify-email/resend/", EmailVerificationRequestView.as_view(), name="auth-email-verify-resend"),
    path("api/auth/password-reset/", PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path(
        "api/auth/password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="auth-password-reset-confirm",
    ),
    path("api/courier/location/", CourierProfileView.as_view(), name="courier-location"),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
