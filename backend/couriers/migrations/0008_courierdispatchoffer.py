from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("couriers", "0007_courierprofile_avatar"),
        ("orders", "0004_orderevent"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CourierDispatchOffer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("offered", "Offered"), ("accepted", "Accepted"), ("declined", "Declined"), ("expired", "Expired"), ("cancelled", "Cancelled")], default="offered", max_length=24)),
                ("distance_km", models.DecimalField(decimal_places=2, max_digits=7)),
                ("offered_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("responded_at", models.DateTimeField(blank=True, null=True)),
                ("courier", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="dispatch_offers", to=settings.AUTH_USER_MODEL)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="dispatch_offers", to="orders.order")),
            ],
            options={"ordering": ("-offered_at", "-id")},
        ),
        migrations.AddIndex(model_name="courierdispatchoffer", index=models.Index(fields=["order", "status", "expires_at"], name="couriers_co_order_i_e925d7_idx")),
        migrations.AddIndex(model_name="courierdispatchoffer", index=models.Index(fields=["courier", "status", "expires_at"], name="couriers_co_courier_d36b5c_idx")),
        migrations.AddConstraint(model_name="courierdispatchoffer", constraint=models.UniqueConstraint(fields=("order", "courier"), name="unique_dispatch_offer_per_order_courier")),
    ]
