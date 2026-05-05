from django.db import models


class ProductCategory(models.Model):
    restaurant = models.ForeignKey(
        "restaurants.Restaurant",
        on_delete=models.CASCADE,
        related_name="product_categories",
    )
    name = models.CharField(max_length=140)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("sort_order", "name")
        unique_together = ("restaurant", "name")
        verbose_name_plural = "Product categories"

    def __str__(self):
        return f"{self.restaurant.name} - {self.name}"

