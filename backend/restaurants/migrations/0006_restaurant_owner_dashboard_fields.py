from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("restaurants", "0005_restaurant_sponsored_mode_restaurant_website_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="restaurant",
            name="instagram_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="restaurant",
            name="promo_video_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="restaurant",
            name="tiktok_url",
            field=models.URLField(blank=True),
        ),
    ]
