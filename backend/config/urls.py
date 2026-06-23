from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from addresses.views import AddressViewSet
from couriers.views import CourierOrderViewSet, CourierProfileView
from menus.views import RestaurantOwnerProductCategoryViewSet
from orders.views import OrderViewSet, RestaurantOwnerOrderViewSet
from payments.views import CheckoutView, StripeWebhookView
from products.views import ProductCommentViewSet, ProductViewSet, RestaurantOwnerProductViewSet
from restaurants.views import RestaurantCategoryViewSet, RestaurantOwnerRestaurantViewSet, RestaurantViewSet
from users.views import (
    EmailTemplatePreviewView,
    EmailVerificationConfirmView,
    EmailVerificationConfirmPageView,
    EmailVerificationPreviewPageView,
    EmailVerificationRequestView,
    LoginView,
    LogoutView,
    MeView,
    PasswordResetEmailTemplatePreviewView,
    PasswordResetConfirmPageView,
    PasswordResetPreviewPageView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    SocialLoginView,
    WelcomeEmailTemplatePreviewView,
)


router = DefaultRouter()
router.register("restaurant-categories", RestaurantCategoryViewSet, basename="restaurant-category")
router.register("restaurants", RestaurantViewSet, basename="restaurant")
router.register("products", ProductViewSet, basename="product")
router.register("product-comments", ProductCommentViewSet, basename="product-comment")
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
router.register(
    "restaurant-owner/restaurants",
    RestaurantOwnerRestaurantViewSet,
    basename="restaurant-owner-restaurant",
)
router.register(
    "restaurant-owner/categories",
    RestaurantOwnerProductCategoryViewSet,
    basename="restaurant-owner-category",
)
router.register("courier/orders", CourierOrderViewSet, basename="courier-order")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("verify-email/confirm/", EmailVerificationConfirmPageView.as_view(), name="email-verify-confirm-page"),
    path("reset-password/confirm/", PasswordResetConfirmPageView.as_view(), name="password-reset-confirm-page"),
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
    path("api/payments/checkout/", CheckoutView.as_view(), name="payments-checkout"),
    path("api/payments/stripe/webhook/", StripeWebhookView.as_view(), name="payments-stripe-webhook"),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += [
        path("email-preview/verify/", EmailTemplatePreviewView.as_view(), name="email-template-verify-preview"),
        path("email-preview/reset/", PasswordResetEmailTemplatePreviewView.as_view(), name="email-template-reset-preview"),
        path("email-preview/welcome/", WelcomeEmailTemplatePreviewView.as_view(), name="email-template-welcome-preview"),
        path("verify-email/preview/", EmailVerificationPreviewPageView.as_view(), name="email-verify-preview-page"),
        path("reset-password/preview/", PasswordResetPreviewPageView.as_view(), name="password-reset-preview-page"),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
