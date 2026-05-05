from django.db import models


class PaymentStatus(models.TextChoices):
    UNPAID = "unpaid", "Unpaid"
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"


class PaymentProvider(models.TextChoices):
    CASH = "cash", "Cash"
    STRIPE = "stripe", "Stripe"
    APPLE_PAY = "apple_pay", "Apple Pay"
    GOOGLE_PAY = "google_pay", "Google Pay"


class Payment(models.Model):
    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="payment")
    provider = models.CharField(max_length=32, choices=PaymentProvider.choices, default=PaymentProvider.CASH)
    provider_payment_id = models.CharField(max_length=180, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=24, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.provider} payment for order #{self.order_id}"

