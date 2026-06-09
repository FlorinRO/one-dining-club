from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("restaurants", "0004_restaurant_entity_type_restaurant_is_sponsored"),
    ]

    operations = [
        migrations.AddField(
            model_name="restaurant",
            name="sponsored_mode",
            field=models.CharField(
                choices=[("native", "Native"), ("external", "External")],
                default="native",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="restaurant",
            name="website_url",
            field=models.URLField(blank=True),
        ),
    ]
