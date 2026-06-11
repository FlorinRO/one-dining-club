from decimal import Decimal

from django.conf import settings
from django.db import models


class Product(models.Model):
    restaurant = models.ForeignKey(
        "restaurants.Restaurant",
        on_delete=models.CASCADE,
        related_name="products",
    )
    category = models.ForeignKey(
        "menus.ProductCategory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    discount_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    is_available = models.BooleanField(default=True)
    is_popular = models.BooleanField(default=False)
    preparation_time = models.PositiveIntegerField(default=15)
    allergens = models.TextField(blank=True)
    ingredients = models.TextField(blank=True)
    calories = models.PositiveIntegerField(null=True, blank=True)
    audio_url = models.URLField(max_length=500, blank=True, null=True)
    has_audio = models.BooleanField(default=True)
    video_url = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("category__sort_order", "name")
        indexes = [
            models.Index(fields=("restaurant", "is_available")),
            models.Index(fields=("is_popular",)),
        ]

    def __str__(self):
        return self.name

    @property
    def effective_price(self):
        return self.discount_price if self.discount_price is not None else self.price


class ProductOptionGroup(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="option_groups")
    name = models.CharField(max_length=140)
    is_required = models.BooleanField(default=False)
    min_select = models.PositiveIntegerField(default=0)
    max_select = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("id",)

    def __str__(self):
        return f"{self.product.name} - {self.name}"


class ProductOption(models.Model):
    option_group = models.ForeignKey(
        ProductOptionGroup,
        on_delete=models.CASCADE,
        related_name="options",
    )
    name = models.CharField(max_length=140)
    extra_price = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ("id",)

    def __str__(self):
        return f"{self.option_group.name} - {self.name}"


class ProductLike(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("product", "user")
        indexes = [
            models.Index(fields=("product", "created_at")),
            models.Index(fields=("user", "created_at")),
        ]

    def __str__(self):
        return f"{self.user_id} liked {self.product_id}"


class ProductComment(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_comments")
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )
    text = models.TextField(blank=True)
    photo_urls = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("product", "-created_at")),
            models.Index(fields=("parent", "created_at")),
        ]

    def __str__(self):
        return f"Comment {self.pk} on {self.product_id}"


class ProductCommentLike(models.Model):
    comment = models.ForeignKey(ProductComment, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_comment_likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("comment", "user")
        indexes = [
            models.Index(fields=("comment", "created_at")),
            models.Index(fields=("user", "created_at")),
        ]

    def __str__(self):
        return f"{self.user_id} liked comment {self.comment_id}"
