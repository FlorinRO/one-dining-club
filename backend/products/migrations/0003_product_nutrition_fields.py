from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="calories",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="product",
            name="ingredients",
            field=models.TextField(blank=True),
        ),
    ]
