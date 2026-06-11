from django.conf import settings
from django.db import models
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
