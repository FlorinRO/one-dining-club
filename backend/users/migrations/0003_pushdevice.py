import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_socialaccount"),
    ]

    operations = [
        migrations.CreateModel(
            name="PushDevice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("expo_push_token", models.CharField(max_length=255, unique=True)),
                (
                    "platform",
                    models.CharField(
                        choices=[
                            ("ios", "iOS"),
                            ("android", "Android"),
                            ("web", "Web"),
                            ("unknown", "Unknown"),
                        ],
                        default="unknown",
                        max_length=16,
                    ),
                ),
                ("device_id", models.CharField(blank=True, db_index=True, max_length=128)),
                ("app_version", models.CharField(blank=True, max_length=32)),
                ("is_active", models.BooleanField(default=True)),
                ("last_registered_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="push_devices",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ("-last_registered_at",),
            },
        ),
        migrations.AddIndex(
            model_name="pushdevice",
            index=models.Index(fields=["user", "is_active"], name="users_pushd_user_id_07a34d_idx"),
        ),
        migrations.AddIndex(
            model_name="pushdevice",
            index=models.Index(fields=["expo_push_token", "is_active"], name="users_pushd_expo_pu_d8df59_idx"),
        ),
    ]
