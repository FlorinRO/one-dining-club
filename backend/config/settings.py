import os
from datetime import timedelta
from email.utils import formataddr
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def get_env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def get_env_list(name, default=""):
    raw_value = os.getenv(name, default)
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def join_url(base_url, path):
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def strip_url_scheme(value):
    return value.replace("https://", "").replace("http://", "").rstrip("/")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "development-only-secret-key-change-before-production")
DEBUG = get_env_bool("DJANGO_DEBUG", default=True)

PRIMARY_DOMAIN = os.getenv("PRIMARY_DOMAIN", "yumzy.ro")
WWW_DOMAIN = os.getenv("WWW_DOMAIN", "www.yumzy.ro")
SITE_URL = os.getenv("SITE_URL", f"https://{PRIMARY_DOMAIN}")
FRONTEND_URL = os.getenv("FRONTEND_URL", SITE_URL)
BACKEND_URL = os.getenv("BACKEND_URL", SITE_URL)
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "support@yumzy.ro")
DEFAULT_FROM_EMAIL_ADDRESS = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@yumzy.ro")
DEFAULT_FROM_EMAIL = formataddr(("Yumzy", DEFAULT_FROM_EMAIL_ADDRESS))
SERVER_EMAIL = formataddr(("Yumzy", os.getenv("SERVER_EMAIL_ADDRESS", DEFAULT_FROM_EMAIL_ADDRESS)))

ALLOWED_HOSTS = get_env_list(
    "DJANGO_ALLOWED_HOSTS",
    f"{PRIMARY_DOMAIN},{WWW_DOMAIN},localhost,127.0.0.1",
)
if DEBUG and "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")
if DEBUG and "*" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("*")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "wagtail.contrib.forms",
    "wagtail.contrib.redirects",
    "wagtail.embeds",
    "wagtail.sites",
    "wagtail.users",
    "wagtail.snippets",
    "wagtail.documents",
    "wagtail.images",
    "wagtail.search",
    "wagtail.admin",
    "wagtail",
    "modelcluster",
    "taggit",
    "corsheaders",
    "django_filters",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "core",
    "users",
    "restaurants",
    "menus",
    "products",
    "addresses",
    "orders",
    "payments",
    "couriers",
    "promotions",
    "reviews",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "wagtail.contrib.redirects.middleware.RedirectMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Europe/Bucharest"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

MEDIA_STORAGE_PROVIDER = os.getenv("MEDIA_STORAGE_PROVIDER", "").strip().lower()
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "").strip()
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "").strip()
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "").strip()
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "").strip()
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL", "").strip() or (
    f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com" if R2_ACCOUNT_ID else ""
)
R2_PUBLIC_URL = (os.getenv("R2_PUBLIC_URL") or os.getenv("R2_PUBLIC_BASE_URL") or "").strip().rstrip("/")
R2_MEDIA_LOCATION = os.getenv("R2_MEDIA_LOCATION", "media").strip("/")
USE_R2_MEDIA_STORAGE = MEDIA_STORAGE_PROVIDER in {"r2", "s3"} or all(
    [R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT_URL]
)

if USE_R2_MEDIA_STORAGE:
    INSTALLED_APPS.append("storages")
    s3_options = {
        "access_key": R2_ACCESS_KEY_ID,
        "secret_key": R2_SECRET_ACCESS_KEY,
        "bucket_name": R2_BUCKET_NAME,
        "endpoint_url": R2_ENDPOINT_URL,
        "region_name": "auto",
        "default_acl": None,
        "querystring_auth": False,
        "file_overwrite": False,
        "location": R2_MEDIA_LOCATION,
        "object_parameters": {
            "CacheControl": "public, max-age=31536000, immutable",
        },
    }
    if R2_PUBLIC_URL:
        s3_options["custom_domain"] = strip_url_scheme(R2_PUBLIC_URL)
        s3_options["url_protocol"] = "https:"
        MEDIA_URL = f"{R2_PUBLIC_URL}/"

    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": s3_options,
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_DELIVERY_PROVIDER = os.getenv(
    "EMAIL_DELIVERY_PROVIDER",
    "django" if DEBUG else "sendgrid",
).strip().lower()
PASSWORD_RESET_CONFIRM_URL = os.getenv(
    "PASSWORD_RESET_CONFIRM_URL",
    join_url(BACKEND_URL, "/reset-password/confirm/") + "?uid={uid}&token={token}",
)
EMAIL_VERIFICATION_CONFIRM_URL = os.getenv(
    "EMAIL_VERIFICATION_CONFIRM_URL",
    join_url(BACKEND_URL, "/verify-email/confirm/") + "?uid={uid}&token={token}",
)
EMAIL_VERIFICATION_APP_URL = os.getenv("EMAIL_VERIFICATION_APP_URL", "onediningclub://")
IOS_APP_STORE_URL = os.getenv("IOS_APP_STORE_URL", "").strip()
APPLE_DEVELOPER_TEAM_ID = os.getenv("APPLE_DEVELOPER_TEAM_ID", "").strip()
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = get_env_bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = get_env_bool("EMAIL_USE_SSL", default=False)
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "20"))
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
SENDGRID_API_BASE_URL = os.getenv("SENDGRID_API_BASE_URL", "https://api.sendgrid.com").rstrip("/")
APPLE_SIGN_IN_AUDIENCES = get_env_list("APPLE_SIGN_IN_AUDIENCES", "club.onedining.customer")
APPLE_ASSOCIATED_APP_IDS = get_env_list("APPLE_ASSOCIATED_APP_IDS")
if not APPLE_ASSOCIATED_APP_IDS and APPLE_DEVELOPER_TEAM_ID and APPLE_SIGN_IN_AUDIENCES:
    APPLE_ASSOCIATED_APP_IDS = [f"{APPLE_DEVELOPER_TEAM_ID}.{APPLE_SIGN_IN_AUDIENCES[0]}"]
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
STRIPE_MERCHANT_DISPLAY_NAME = os.getenv("STRIPE_MERCHANT_DISPLAY_NAME", "YUMZY").strip() or "YUMZY"
STRIPE_MERCHANT_COUNTRY_CODE = os.getenv("STRIPE_MERCHANT_COUNTRY_CODE", "RO").strip().upper() or "RO"
STRIPE_CURRENCY = os.getenv("STRIPE_CURRENCY", "ron").strip().lower() or "ron"
PUSH_NOTIFICATIONS_ENABLED = get_env_bool("PUSH_NOTIFICATIONS_ENABLED", default=True)
EXPO_PUSH_API_URL = os.getenv("EXPO_PUSH_API_URL", "https://exp.host/--/api/v2/push/send").strip()
EXPO_PUSH_ACCESS_TOKEN = os.getenv("EXPO_PUSH_ACCESS_TOKEN", "").strip()
EXPO_PUSH_TIMEOUT_SECONDS = float(os.getenv("EXPO_PUSH_TIMEOUT_SECONDS", "5"))

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
SITE_ID = 1
WAGTAIL_SITE_NAME = "Yumzy Backoffice"
WAGTAILADMIN_BASE_URL = BACKEND_URL

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticatedOrReadOnly",),
    "DEFAULT_PAGINATION_CLASS": "core.pagination.DefaultPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

CSRF_TRUSTED_ORIGINS = get_env_list(
    "CSRF_TRUSTED_ORIGINS",
    f"https://{PRIMARY_DOMAIN},https://{WWW_DOMAIN},http://localhost:8000,http://127.0.0.1:8000",
)

CORS_ALLOWED_ORIGINS = get_env_list(
    "CORS_ALLOWED_ORIGINS",
    (
        f"{SITE_URL},https://{WWW_DOMAIN},https://dashboard.yumzy.ro,"
        "http://localhost:19006,http://localhost:8081,"
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174,"
        "http://localhost:8012,http://127.0.0.1:8012"
    ),
)
