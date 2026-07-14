from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("couriers", "0006_profile_preferences_documents_support"),
    ]

    operations = [
        migrations.AddField(
            model_name="courierprofile",
            name="avatar",
            field=models.ImageField(blank=True, null=True, upload_to="couriers/avatars/"),
        ),
    ]
