from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SocialAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "provider",
                    models.CharField(
                        choices=[("google", "Google"), ("facebook", "Facebook"), ("apple", "Apple")],
                        max_length=32,
                    ),
                ),
                ("subject", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="social_accounts",
                        to="users.user",
                    ),
                ),
            ],
            options={
                "ordering": ("provider", "subject"),
            },
        ),
        migrations.AddConstraint(
            model_name="socialaccount",
            constraint=models.UniqueConstraint(
                fields=("provider", "subject"),
                name="users_social_account_provider_subject_uniq",
            ),
        ),
    ]
