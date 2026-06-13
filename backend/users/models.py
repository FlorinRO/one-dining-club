from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    CUSTOMER = "customer", "Customer"
    RESTAURANT_OWNER = "restaurant_owner", "Restaurant owner"
    COURIER = "courier", "Courier"
    ADMIN = "admin", "Admin"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", UserRole.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, blank=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=32, choices=UserRole.choices, default=UserRole.CUSTOMER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ("-date_joined",)

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_customer(self):
        return self.role == UserRole.CUSTOMER

    @property
    def is_restaurant_owner(self):
        return self.role == UserRole.RESTAURANT_OWNER

    @property
    def is_courier(self):
        return self.role == UserRole.COURIER

    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN or self.is_staff or self.is_superuser


class CustomerProfile(models.Model):
    user = models.OneToOneField("users.User", on_delete=models.CASCADE, related_name="customer_profile")
    default_address = models.ForeignKey(
        "addresses.Address",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    phone_number = models.CharField(max_length=32, blank=True)

    def __str__(self):
        return f"Customer profile for {self.user.email}"


class SocialAccount(models.Model):
    PROVIDER_GOOGLE = "google"
    PROVIDER_FACEBOOK = "facebook"
    PROVIDER_APPLE = "apple"
    PROVIDER_CHOICES = (
        (PROVIDER_GOOGLE, "Google"),
        (PROVIDER_FACEBOOK, "Facebook"),
        (PROVIDER_APPLE, "Apple"),
    )

    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="social_accounts")
    provider = models.CharField(max_length=32, choices=PROVIDER_CHOICES)
    subject = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("provider", "subject"), name="users_social_account_provider_subject_uniq"),
        ]
        ordering = ("provider", "subject")

    def __str__(self):
        return f"{self.provider}:{self.subject}"
