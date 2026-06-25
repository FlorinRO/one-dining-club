from django.db import migrations


def delete_glow_market(apps, schema_editor):
    Restaurant = apps.get_model("restaurants", "Restaurant")
    Restaurant.objects.filter(slug="glow-market").delete()
    Restaurant.objects.filter(name__iexact="Glow Market").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("restaurants", "0006_restaurant_owner_dashboard_fields"),
    ]

    operations = [
        migrations.RunPython(delete_glow_market, migrations.RunPython.noop),
    ]
