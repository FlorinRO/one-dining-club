from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("couriers", "0004_courieroperationentry"),
    ]

    operations = [
        migrations.AddField(
            model_name="courieroperationentry",
            name="metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
