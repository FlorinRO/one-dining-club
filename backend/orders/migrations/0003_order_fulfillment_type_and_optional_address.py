import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="address",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="orders", to="addresses.address"),
        ),
        migrations.AddField(
            model_name="order",
            name="fulfillment_type",
            field=models.CharField(choices=[("delivery", "Delivery"), ("pickup", "Pickup")], default="delivery", max_length=24),
        ),
    ]
