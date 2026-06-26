import unicodedata


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

PRODUCT_TYPE_LABELS = dict(PRODUCT_TYPE_CHOICES)

PRODUCT_TYPE_KEYWORDS = {
    "pizza": ("pizza", "pinsa", "calzone", "focaccia"),
    "burger": ("burger", "smash", "cheeseburger", "sandwich", "wrap", "shawarma", "kebab"),
    "asian": ("asian", "asiatic", "wok", "noodle", "ramen", "pho", "thai", "chinez", "bao", "dumpling"),
    "sushi": ("sushi", "maki", "nigiri", "sashimi", "uramaki"),
    "pasta": ("pasta", "paste", "spaghetti", "penne", "tagliatelle", "carbonara", "lasagna", "ravioli", "gnocchi"),
    "grill": ("grill", "bbq", "barbecue", "gratar", "grătar", "steak", "mici", "coaste"),
    "salad": ("salad", "salata", "salată", "salate", "bowl", "poke"),
    "soup": ("soup", "supa", "supă", "ciorba", "ciorbă"),
    "breakfast": ("breakfast", "mic dejun", "brunch", "omelette", "omleta", "omletă", "pancake", "croissant"),
    "dessert": ("dessert", "desert", "cake", "tiramisu", "gelato", "ice cream", "donut", "clatite", "clătite", "prajitura", "prăjitură"),
    "bakery": ("bakery", "panificatie", "panificație", "patiserie", "cofetarie", "cofetărie", "pastry", "bread", "bagel"),
    "drinks": ("drink", "drinks", "bauturi", "băuturi", "juice", "smoothie", "soda", "cocktail", "tea", "ceai", "cafea", "coffee", "espresso", "latte", "cappuccino", "cola", "water", "apa", "apă"),
}


def normalize_product_type_text(value):
    return (
        unicodedata.normalize("NFD", str(value or ""))
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
        .strip()
    )


def infer_product_type(*values):
    haystack = " ".join(normalize_product_type_text(value) for value in values if value).strip()
    if not haystack:
        return "other"

    for product_type, keywords in PRODUCT_TYPE_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return product_type
    return "other"
