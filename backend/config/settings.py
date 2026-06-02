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
    join_url(FRONTEND_URL, "/reset-password") + "?uid={uid}&token={token}",
)
EMAIL_VERIFICATION_CONFIRM_URL = os.getenv(
    "EMAIL_VERIFICATION_CONFIRM_URL",
    join_url(BACKEND_URL, "/api/auth/verify-email/confirm/") + "?uid={uid}&token={token}",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = get_env_bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = get_env_bool("EMAIL_USE_SSL", default=False)
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "20"))
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
SENDGRID_API_BASE_URL = os.getenv("SENDGRID_API_BASE_URL", "https://api.sendgrid.com").rstrip("/")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

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
    f"{SITE_URL},https://{WWW_DOMAIN},http://localhost:19006,http://localhost:8081",
)
