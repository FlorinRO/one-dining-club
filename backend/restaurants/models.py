from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify


class RestaurantCategory(models.Model):
    name = models.CharField(max_length=120, unique=True)
    icon = models.CharField(max_length=80, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)
        verbose_name_plural = "Restaurant categories"

    def __str__(self):
        return self.name


class Restaurant(models.Model):
    class EntityType(models.TextChoices):
        RESTAURANT = "restaurant", "Restaurant"
        BRAND = "brand", "Brand"

    class SponsoredMode(models.TextChoices):
        NATIVE = "native", "Native"
        EXTERNAL = "external", "External"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="restaurants",
    )
    categories = models.ManyToManyField(RestaurantCategory, blank=True, related_name="restaurants")
    name = models.CharField(max_length=180)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    entity_type = models.CharField(
        max_length=20,
        choices=EntityType.choices,
        default=EntityType.RESTAURANT,
    )
    is_sponsored = models.BooleanField(default=False)
    sponsored_mode = models.CharField(
        max_length=20,
        choices=SponsoredMode.choices,
        default=SponsoredMode.NATIVE,
    )
    website_url = models.URLField(blank=True)
    promo_video_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    tiktok_url = models.URLField(blank=True)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to="restaurants/logos/", blank=True, null=True)
    cover_image = models.ImageField(upload_to="restaurants/covers/", blank=True, null=True)
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=120, db_index=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    minimum_order = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    estimated_delivery_time_min = models.PositiveIntegerField(default=25)
    estimated_delivery_time_max = models.PositiveIntegerField(default=45)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    supports_pickup = models.BooleanField(default=False)
    is_open = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        indexes = [
            models.Index(fields=("city", "is_active", "is_open")),
            models.Index(fields=("slug",)),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Restaurant.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                counter += 1
                slug = f"{base_slug}-{counter}"
            self.slug = slug
        super().save(*args, **kwargs)


class RestaurantOpeningHours(models.Model):
    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="opening_hours",
    )
    day_of_week = models.PositiveSmallIntegerField(choices=Weekday.choices)
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    is_closed = models.BooleanField(default=False)

    class Meta:
        ordering = ("day_of_week", "opening_time")
        unique_together = ("restaurant", "day_of_week")
        verbose_name_plural = "Restaurant opening hours"

    def __str__(self):
        return f"{self.restaurant.name} - {self.get_day_of_week_display()}"


class RestaurantApplication(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    contact_name = models.CharField(max_length=180)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=32)
    restaurant_name = models.CharField(max_length=180)
    city = models.CharField(max_length=120, db_index=True)
    address = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    description = models.TextField(blank=True)
    website_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    tiktok_url = models.URLField(blank=True)
    cuisine_summary = models.CharField(max_length=255, blank=True)
    products_summary = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDING)
    created_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="restaurant_applications_created",
    )
    created_restaurant = models.ForeignKey(
        "restaurants.Restaurant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_applications",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_restaurant_applications",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("status", "-created_at")),
            models.Index(fields=("contact_email", "status")),
        ]

    def __str__(self):
        return f"{self.restaurant_name} ({self.contact_email})"

    def clean(self):
        super().clean()
        if self.status == self.Status.APPROVED and not self.created_restaurant_id:
            from users.models import UserRole
            from users.models import User

            existing_user = User.objects.filter(email__iexact=self.contact_email).first()
            if existing_user and existing_user.role not in {UserRole.RESTAURANT_OWNER, UserRole.ADMIN}:
                raise ValidationError(
                    {"contact_email": "Există deja un cont pe acest email cu alt rol. Aprobarea nu poate continua."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        previous_status = None
        previous_restaurant_id = None
        if self.pk:
            previous = RestaurantApplication.objects.filter(pk=self.pk).values("status", "created_restaurant_id").first()
            if previous:
                previous_status = previous["status"]
                previous_restaurant_id = previous["created_restaurant_id"]

        super().save(*args, **kwargs)

        should_provision = (
            self.status == self.Status.APPROVED
            and not self.created_restaurant_id
            and (previous_status != self.Status.APPROVED or not previous_restaurant_id)
        )
        if should_provision:
            self._provision_restaurant_account()

    @transaction.atomic
    def _provision_restaurant_account(self):
        from users.models import User, UserRole
        from users.serializers import send_password_reset_email

        owner = User.objects.filter(email__iexact=self.contact_email).first()
        if owner is None:
            owner = User.objects.create_user(
                email=self.contact_email,
                password=None,
                role=UserRole.RESTAURANT_OWNER,
                is_active=True,
                first_name=self.contact_name,
                phone=self.contact_phone,
            )
        else:
            updated_fields = []
            if owner.role == UserRole.RESTAURANT_OWNER and not owner.is_active:
                owner.is_active = True
                updated_fields.append("is_active")
            if self.contact_name and not owner.first_name:
                owner.first_name = self.contact_name
                updated_fields.append("first_name")
            if self.contact_phone and not owner.phone:
                owner.phone = self.contact_phone
                updated_fields.append("phone")
            if updated_fields:
                owner.save(update_fields=updated_fields)

        restaurant = Restaurant.objects.create(
            owner=owner,
            name=self.restaurant_name,
            address=self.address,
            city=self.city,
            latitude=self.latitude,
            longitude=self.longitude,
            description=self.description,
            email=self.contact_email,
            phone=self.contact_phone,
            website_url=self.website_url,
            instagram_url=self.instagram_url,
            tiktok_url=self.tiktok_url,
            is_active=False,
        )
        self.created_owner = owner
        self.created_restaurant = restaurant
        self.reviewed_at = timezone.now()
        super().save(update_fields=("created_owner", "created_restaurant", "reviewed_at", "updated_at"))

        send_password_reset_email(
            owner,
            subject="Activează contul restaurantului în Yumzy",
            headline="Activează contul restaurantului",
            title_html="cont restaurant<br />aprobat",
            body=(
                f"Contul pentru {restaurant.name} a fost aprobat. "
                "Apasă pe butonul de mai jos pentru a seta parola și a intra în dashboard."
            ),
            button_label="Activează contul",
            footnote="După autentificare, completezi profilul și adaugi produsele în Yumzy.",
            intro_message=f"Cererea pentru {restaurant.name} a fost aprobată în Yumzy.",
            intro_text="Cererea restaurantului tău a fost aprobată. Mai ai un singur pas până la dashboard.",
            security_note="Dacă nu te așteptai la acest mesaj, contactează echipa Yumzy.",
        )
