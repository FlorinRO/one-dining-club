from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0003_order_fulfillment_type_and_optional_address"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="OrderEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_type", models.CharField(choices=[("created", "Created"), ("status_changed", "Status changed"), ("courier_assigned", "Courier assigned")], max_length=32)),
                ("source", models.CharField(blank=True, max_length=32)),
                ("previous_status", models.CharField(blank=True, max_length=32)),
                ("next_status", models.CharField(blank=True, max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="order_events", to=settings.AUTH_USER_MODEL)),
                ("courier", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_order_events", to=settings.AUTH_USER_MODEL)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="orders.order")),
            ],
            options={
                "ordering": ("-created_at", "-id"),
            },
        ),
        migrations.AddIndex(
            model_name="orderevent",
            index=models.Index(fields=["order", "-created_at"], name="orders_orde_order_i_68489d_idx"),
        ),
    ]
