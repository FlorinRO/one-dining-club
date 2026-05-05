from django.db import models


class DiscountType(models.TextChoices):
    FIXED = "fixed", "Fixed amount"
    PERCENT = "percent", "Percent"


class PromoCode(models.Model):
    code = models.CharField(max_length=40, unique=True)
    discount_type = models.CharField(max_length=16, choices=DiscountType.choices)
    discount_value = models.DecimalField(max_digits=8, decimal_places=2)
    min_order_value = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    max_discount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("code",)

    def __str__(self):
        return self.code

    def is_valid_for(self, subtotal, now):
        return (
            self.is_active
            and self.valid_from <= now <= self.valid_until
            and subtotal >= self.min_order_value
        )

