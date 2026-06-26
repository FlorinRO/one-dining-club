import unicodedata

from django.db import migrations, models


PRODUCT_TYPE_CHOICES = (
    ("pizza", "Pizza"),
    ("burger", "Burgeri"),
    ("asian", "Asiatic"),
    ("sushi", "Sushi"),
    ("pasta", "Paste"),
    ("grill", "Grill"),
    ("salad", "Salate"),
    ("soup", "Supe"),
    ("breakfast", "Mic dejun"),
    ("dessert", "Desert"),
    ("bakery", "Panificație"),
    ("drinks", "Băuturi"),
    ("other", "Altele"),
)

PRODUCT_TYPE_KEYWORDS = {
    "pizza": ("pizza", "pinsa", "calzone", "focaccia"),
    "burger": ("burger", "smash", "cheeseburger", "sandwich", "wrap", "shawarma", "kebab"),
    "asian": ("asian", "asiatic", "wok", "noodle", "ramen", "pho", "thai", "chinez", "bao", "dumpling"),
    "sushi": ("sushi", "maki", "nigiri", "sashimi", "uramaki"),
    "pasta": ("pasta", "paste", "spaghetti", "penne", "tagliatelle", "carbonara", "lasagna", "ravioli", "gnocchi"),
    "grill": ("grill", "bbq", "barbecue", "gratar", "steak", "mici", "coaste"),
    "salad": ("salad", "salata", "salate", "bowl", "poke"),
    "soup": ("soup", "supa", "ciorba"),
    "breakfast": ("breakfast", "mic dejun", "brunch", "omelette", "omleta", "pancake", "croissant"),
    "dessert": ("dessert", "desert", "cake", "tiramisu", "gelato", "ice cream", "donut", "clatite", "prajitura"),
    "bakery": ("bakery", "panificatie", "patiserie", "cofetarie", "pastry", "bread", "bagel"),
    "drinks": ("drink", "drinks", "bauturi", "juice", "smoothie", "soda", "cocktail", "tea", "ceai", "cafea", "coffee", "espresso", "latte", "cappuccino", "cola", "water", "apa"),
}


def normalize_text(value):
    return (
        unicodedata.normalize("NFD", str(value or ""))
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
        .strip()
    )


def infer_product_type(product):
    haystack = " ".join(
        item
        for item in (
            normalize_text(product.name),
            normalize_text(product.description),
            normalize_text(getattr(product.category, "name", "")),
            normalize_text(product.restaurant.name if getattr(product, "restaurant_id", None) else ""),
        )
        if item
    )
    for product_type, keywords in PRODUCT_TYPE_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return product_type
    return "other"


def populate_product_types(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    products = Product.objects.select_related("category", "restaurant").all()
    for product in products.iterator():
        product.product_type = infer_product_type(product)
        product.save(update_fields=["product_type"])


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0005_productcomment_productcommentlike_productlike_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="product_type",
            field=models.CharField(choices=PRODUCT_TYPE_CHOICES, default="other", max_length=32),
        ),
        migrations.RunPython(populate_product_types, migrations.RunPython.noop),
    ]
