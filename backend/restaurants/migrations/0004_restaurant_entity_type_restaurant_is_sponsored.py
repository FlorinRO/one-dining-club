from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("restaurants", "0003_restaurant_supports_pickup"),
    ]

    operations = [
        migrations.AddField(
            model_name="restaurant",
            name="entity_type",
            field=models.CharField(
                choices=[("restaurant", "Restaurant"), ("brand", "Brand")],
                default="restaurant",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="restaurant",
            name="is_sponsored",
            field=models.BooleanField(default=False),
        ),
    ]
