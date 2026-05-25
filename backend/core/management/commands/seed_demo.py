from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from addresses.models import Address
from menus.models import ProductCategory
from products.models import Product, ProductOption, ProductOptionGroup
from promotions.models import DiscountType, PromoCode
from restaurants.models import Restaurant, RestaurantCategory
from users.models import CustomerProfile, User, UserRole


class Command(BaseCommand):
    help = "Seed demo data for local MVP development."

    def handle(self, *args, **options):
        ingredient_profiles = [
            "pui, salata, rosii, ceapa rosie, sos house",
            "vita, cheddar, castraveti murati, mustar, ketchup",
            "somon, avocado, orez, susan, sos ponzu",
            "tofu, ardei, morcov, noodles, sos de soia",
            "halloumi, quinoa, castravete, masline, dressing lamaie",
            "pork belly, varza, ceapa verde, maioneza picanta",
            "creveti, usturoi, unt, patrunjel, chili flakes",
            "ciuperci, parmezan, usturoi, ulei de masline, busuioc",
            "falafel, hummus, rosii, tahini, patrunjel",
            "curcan, orez brun, broccoli, porumb, lime",
        ]

        customer, _ = User.objects.get_or_create(
            email="demo@onedining.club",
            defaults={
                "first_name": "Client",
                "last_name": "Demo",
                "phone": "+40720000000",
                "role": UserRole.CUSTOMER,
            },
        )
        customer.set_password("password123")
        customer.save()
        CustomerProfile.objects.get_or_create(user=customer, defaults={"phone_number": customer.phone})

        owner, _ = User.objects.get_or_create(
            email="owner@onedining.club",
            defaults={
                "first_name": "Restaurant",
                "last_name": "Owner",
                "phone": "+40721111111",
                "role": UserRole.RESTAURANT_OWNER,
            },
        )
        owner.set_password("password123")
        owner.save()

        category_map = {}
        for name, icon in [
            ("Italian", "pizza"),
            ("Asian", "bowl"),
            ("Burgers", "burger"),
            ("Healthy", "leaf"),
            ("Desserts", "dessert"),
            ("Coffee", "coffee"),
            ("Japanese", "ramen"),
            ("Mexican", "taco"),
            ("Korean", "chicken"),
            ("BBQ", "grill"),
            ("Brunch", "coffee"),
            ("Middle Eastern", "falafel"),
        ]:
            category_map[name], _ = RestaurantCategory.objects.get_or_create(name=name, defaults={"icon": icon})

        restaurants_payload = [
            {
                "slug": "luna-rossa-kitchen",
                "name": "Luna Rossa Kitchen",
                "description": "Paste proaspete, pizza napoletana si deserturi facute in casa.",
                "phone": "+40722222222",
                "email": "hello@lunarossa.test",
                "address": "Strada Frumoasa 12",
                "city": "Bucuresti",
                "latitude": Decimal("44.441000"),
                "longitude": Decimal("26.096000"),
                "delivery_fee": Decimal("9.99"),
                "minimum_order": Decimal("35.00"),
                "estimated_delivery_time_min": 25,
                "estimated_delivery_time_max": 40,
                "rating": Decimal("4.80"),
                "categories": ["Italian"],
                "products": [
                    ("Pizza", "Pizza Diavola", "Sos San Marzano, mozzarella, salam picant.", Decimal("46.00"), Decimal("39.00"), 18, "Gluten, lactoza"),
                    ("Pasta", "Tagliatelle Tartufo", "Tagliatelle, crema de parmezan, ciuperci si ulei de trufe.", Decimal("52.00"), None, 16, "Gluten, ou, lactoza"),
                ],
            },
            {
                "slug": "wok-yard",
                "name": "Wok Yard",
                "description": "Boluri asiatice, ramen si stir-fry rapid.",
                "phone": "+40723333333",
                "email": "hello@wokyard.test",
                "address": "Bulevardul Unirii 17",
                "city": "Bucuresti",
                "latitude": Decimal("44.428300"),
                "longitude": Decimal("26.102500"),
                "delivery_fee": Decimal("7.99"),
                "minimum_order": Decimal("30.00"),
                "estimated_delivery_time_min": 20,
                "estimated_delivery_time_max": 35,
                "rating": Decimal("4.70"),
                "categories": ["Asian"],
                "products": [
                    ("Ramen", "Tonkotsu Ramen", "Supa bogata, noodles, chashu, ou marinat.", Decimal("49.00"), None, 20, "Gluten, ou, soia"),
                    ("Wok", "Chicken Teriyaki Bowl", "Orez jasmine, pui glazurat, legume wok.", Decimal("42.00"), Decimal("36.00"), 14, "Soia, susan"),
                ],
            },
            {
                "slug": "smash-brothers",
                "name": "Smash Brothers",
                "description": "Smash burgers, cartofi loaded si sosuri craft.",
                "phone": "+40724444444",
                "email": "hello@smashbrothers.test",
                "address": "Calea Victoriei 90",
                "city": "Bucuresti",
                "latitude": Decimal("44.443500"),
                "longitude": Decimal("26.091800"),
                "delivery_fee": Decimal("8.49"),
                "minimum_order": Decimal("32.00"),
                "estimated_delivery_time_min": 22,
                "estimated_delivery_time_max": 36,
                "rating": Decimal("4.60"),
                "categories": ["Burgers"],
                "products": [
                    ("Burgers", "Double Smash", "Doua chiftele smashed, cheddar, ceapa caramelizata.", Decimal("44.00"), None, 15, "Gluten, lactoza"),
                    ("Sides", "Loaded Fries", "Cartofi, cheddar, bacon crispy si jalapeno.", Decimal("23.00"), None, 10, "Lactoza"),
                ],
            },
            {
                "slug": "green-fork",
                "name": "Green Fork",
                "description": "Salate, protein bowls si optiuni veg-friendly.",
                "phone": "+40725555555",
                "email": "hello@greenfork.test",
                "address": "Strada Mendeleev 8",
                "city": "Bucuresti",
                "latitude": Decimal("44.446100"),
                "longitude": Decimal("26.098100"),
                "delivery_fee": Decimal("6.99"),
                "minimum_order": Decimal("28.00"),
                "estimated_delivery_time_min": 18,
                "estimated_delivery_time_max": 30,
                "rating": Decimal("4.75"),
                "categories": ["Healthy"],
                "products": [
                    ("Bowls", "Salmon Power Bowl", "Somon, quinoa, avocado, kale si dressing citric.", Decimal("48.00"), None, 12, "Peste"),
                    ("Salads", "Caesar Crunch", "Salata romana, pui, parmezan, crutoane.", Decimal("37.00"), Decimal("33.00"), 11, "Gluten, lactoza"),
                ],
            },
            {
                "slug": "dolce-notte",
                "name": "Dolce Notte",
                "description": "Deserturi artizanale, tiramisu si cafea de specialitate.",
                "phone": "+40726666666",
                "email": "hello@dolcenotte.test",
                "address": "Strada Arthur Verona 11",
                "city": "Bucuresti",
                "latitude": Decimal("44.447500"),
                "longitude": Decimal("26.101100"),
                "delivery_fee": Decimal("5.99"),
                "minimum_order": Decimal("20.00"),
                "estimated_delivery_time_min": 15,
                "estimated_delivery_time_max": 25,
                "rating": Decimal("4.90"),
                "categories": ["Desserts", "Coffee"],
                "products": [
                    ("Desserts", "Tiramisu Classic", "Mascarpone, espresso, piscoturi si cacao.", Decimal("26.00"), None, 8, "Gluten, ou, lactoza"),
                    ("Coffee", "Flat White", "Double shot espresso cu microspuma fina.", Decimal("16.00"), None, 6, "Lactoza"),
                ],
            },
        ]
        generated_payload = [
            ("sushi-loop", "Sushi Loop", "Sushi si poke fresh.", "Asian", "Sushi", "Salmon Nigiri", "Poke Bowl"),
            ("taco-loco", "Taco Loco", "Street food mexican autentic.", "Burgers", "Tacos", "Chicken Taco", "Beef Quesadilla"),
            ("pasta-fresca", "Pasta Fresca", "Pasta daily made.", "Italian", "Pasta", "Penne Arrabbiata", "Lasagna al Forno"),
            ("pho-station", "Pho Station", "Supe vietnameze si wok.", "Asian", "Soups", "Pho Bo", "Crispy Spring Rolls"),
            ("bagel-bros", "Bagel Bros", "Breakfast & brunch toata ziua.", "Coffee", "Breakfast", "Egg & Bacon Bagel", "Blueberry Pancakes"),
            ("mediterraneo", "Mediterraneo", "Greci, grill si salate.", "Healthy", "Grill", "Chicken Souvlaki", "Greek Salad"),
            ("burger-craft", "Burger Craft", "Burgeri premium si loaded fries.", "Burgers", "Burgers", "Classic Cheeseburger", "Truffle Fries"),
            ("curry-house", "Curry House", "Curries aromate si naan proaspat.", "Asian", "Curry", "Butter Chicken", "Paneer Tikka Masala"),
            ("fit-kitchen", "Fit Kitchen", "Mese fit cu calorii controlate.", "Healthy", "Bowls", "Turkey Protein Bowl", "Tofu Green Bowl"),
            ("gelato-lab", "Gelato Lab", "Gelato artizanal si deserturi.", "Desserts", "Desserts", "Pistachio Gelato", "Chocolate Lava Cake"),
        ]
        for idx, row in enumerate(generated_payload, start=6):
            slug, name, description, category_name, menu_category, p1, p2 = row
            base_lat = Decimal("44.430000") + Decimal(idx) / Decimal("1000")
            base_lng = Decimal("26.090000") + Decimal(idx) / Decimal("1200")
            restaurants_payload.append(
                {
                    "slug": slug,
                    "name": name,
                    "description": description,
                    "phone": f"+40727{idx:05d}",
                    "email": f"hello@{slug}.test",
                    "address": f"Strada Demo {idx}",
                    "city": "Bucuresti",
                    "latitude": base_lat,
                    "longitude": base_lng,
                    "delivery_fee": Decimal(f"{5 + (idx % 5)}.99"),
                    "minimum_order": Decimal(f"{20 + (idx % 4) * 4}.00"),
                    "estimated_delivery_time_min": 15 + (idx % 7),
                    "estimated_delivery_time_max": 25 + (idx % 10),
                    "rating": Decimal(f"4.{(idx % 4) + 5}0"),
                    "categories": [category_name],
                    "products": [
                        (menu_category, p1, f"{p1} - preparat signature.", Decimal(f"{30 + idx}.00"), None, 12 + (idx % 8), "Poate contine alergeni"),
                        (menu_category, p2, f"{p2} - preparat popular.", Decimal(f"{24 + idx}.00"), Decimal(f"{22 + idx}.00"), 10 + (idx % 7), "Poate contine alergeni"),
                    ],
                }
            )

        expanded_demo_payload = [
            (
                "umami-reels",
                "Umami Reels",
                "Ramen, karaage si bowls japoneze gandite pentru feed-uri video rapide.",
                "Japanese",
                "Ramen",
                ["Shoyu Glow Ramen", "Karaage Crunch Bowl", "Miso Butter Corn Ramen", "Yuzu Salmon Don", "Tokyo Egg Sando", "Gyoza Drip Plate", "Tonkatsu Reel Curry", "Sesame Udon Toss", "Wasabi Tuna Roll", "Matcha Mochi Stack"],
                "Gluten, ou, soia",
            ),
            (
                "neon-taco-bar",
                "Neon Taco Bar",
                "Tacos, quesadilla si street corn cu salsa proaspata si plating colorat.",
                "Mexican",
                "Tacos",
                ["Birria Dip Taco", "Al Pastor Neon Taco", "Chipotle Chicken Quesadilla", "Street Corn Crunch", "Avocado Lime Tostada", "Beef Barbacoa Burrito", "Crispy Fish Taco", "Mango Salsa Nachos", "Pork Carnitas Bowl", "Churro Dulce Bites"],
                "Gluten, lactoza",
            ),
            (
                "carbonara-cut",
                "Carbonara Cut",
                "Paste fresh, focaccia si sosuri italiene cu portii filmabile.",
                "Italian",
                "Pasta",
                ["Guanciale Carbonara Reel", "Truffle Cacio Pepe", "Vodka Rigatoni Pull", "Pesto Burrata Linguine", "Short Rib Pappardelle", "Focaccia Stracciatella", "Ravioli Sage Butter", "Spicy Arrabbiata Mafalde", "Lemon Ricotta Gnocchi", "Tiramisu Spoon Shot"],
                "Gluten, ou, lactoza",
            ),
            (
                "crispy-seoul-lab",
                "Crispy Seoul Lab",
                "Korean fried chicken, bibimbap si sosuri gochujang cu crunch puternic.",
                "Korean",
                "Korean",
                ["Gochujang Wing Tower", "Honey Garlic Dakgangjeong", "Kimchi Fried Rice Pop", "Bulgogi Bibimbap", "Corn Cheese Lava Bowl", "Crispy Tteok Skewers", "Seoul Slaw Chicken Burger", "Japchae Glass Noodles", "Soy Sesame Drumsticks", "Hotteok Caramel Stack"],
                "Gluten, susan, soia",
            ),
            (
                "bowl-motion",
                "Bowl Motion",
                "Protein bowls, salate calde si dressing-uri fresh pentru pranzuri rapide.",
                "Healthy",
                "Bowls",
                ["Green Goddess Chicken Bowl", "Salmon Avocado Motion", "Halloumi Quinoa Crunch", "Turkey Tahini Protein Bowl", "Tofu Peanut Noodle Salad", "Beetroot Feta Energy Bowl", "Lime Shrimp Rice Bowl", "Falafel Kale Plate", "Mango Chicken Fit Bowl", "Cocoa Chia Recovery Cup"],
                "Poate contine alergeni",
            ),
            (
                "smokehouse-loop",
                "Smokehouse Loop",
                "BBQ, brisket, ribs si burgeri afumati cu garnituri consistente.",
                "BBQ",
                "BBQ",
                ["Brisket Burnt Ends Box", "Sticky Rib Reel Rack", "Pulled Pork Smoke Bun", "Maple Bacon Smash", "Charred Corn Slaw Cup", "Smoked Chicken Mac", "Texas Chili Loaded Fries", "BBQ Halloumi Stack", "Pitmaster Sausage Plate", "Peach Cobbler Jar"],
                "Gluten, lactoza",
            ),
            (
                "bao-pop-studio",
                "Bao Pop Studio",
                "Bao buns, dumplings si noodles asiatici cu topping-uri crocante.",
                "Asian",
                "Bao",
                ["Pork Belly Bao Pop", "Crispy Tofu Bao", "Duck Hoisin Bao", "Shrimp Chili Dumplings", "Sichuan Noodle Pull", "Katsu Curry Bao", "Miso Mushroom Dumplings", "Sesame Chicken Rice Box", "Thai Basil Beef Bowl", "Coconut Mango Sticky Rice"],
                "Gluten, susan, soia",
            ),
            (
                "gelato-stories",
                "Gelato Stories",
                "Gelato, prajituri si bauturi reci cu topping-uri de sezon.",
                "Desserts",
                "Desserts",
                ["Pistachio Gelato Swirl", "Salted Caramel Affogato", "Berry Cheesecake Cup", "Chocolate Lava Reel", "Tiramisu Gelato Sandwich", "Lemon Meringue Jar", "Hazelnut Crunch Sundae", "Strawberry Basil Sorbet", "Cannoli Cream Bites", "Espresso Granita Float"],
                "Lactoza, ou",
            ),
            (
                "market-brunch-club",
                "Market Brunch Club",
                "Brunch all-day, sandwich-uri calde, oua si cafea de specialitate.",
                "Brunch",
                "Brunch",
                ["Benedict Market Stack", "Croissant Egg Melt", "Pancake Berry Reel", "Shakshuka Toast Pull", "Avocado Halloumi Tartine", "Bacon Hash Skillet", "Smoked Salmon Bagel", "French Toast Brulee", "Granola Yogurt Jar", "Cold Brew Cream Float"],
                "Gluten, ou, lactoza",
            ),
            (
                "levant-reel-kitchen",
                "Levant Reel Kitchen",
                "Falafel, hummus, kebab si platouri levantine cu lipii calde.",
                "Middle Eastern",
                "Levant",
                ["Falafel Crunch Pita", "Chicken Shawarma Reel", "Beef Kofta Plate", "Hummus Chili Oil Bowl", "Halloumi Za'atar Wrap", "Lamb Kebab Rice Box", "Baba Ganoush Scoop", "Tabbouleh Citrus Salad", "Harissa Cauliflower Pita", "Pistachio Baklava Bites"],
                "Gluten, susan",
            ),
        ]
        for offset, row in enumerate(expanded_demo_payload, start=16):
            slug, name, description, category_name, menu_category, product_names, allergens = row
            base_lat = Decimal("44.432000") + Decimal(offset) / Decimal("900")
            base_lng = Decimal("26.086000") + Decimal(offset) / Decimal("1100")
            restaurants_payload.append(
                {
                    "slug": slug,
                    "name": name,
                    "description": description,
                    "phone": f"+40728{offset:05d}",
                    "email": f"hello@{slug}.test",
                    "address": f"Strada Demo Reels {offset}",
                    "city": "Bucuresti",
                    "latitude": base_lat,
                    "longitude": base_lng,
                    "delivery_fee": Decimal(f"{5 + (offset % 6)}.90"),
                    "minimum_order": Decimal(f"{24 + (offset % 5) * 4}.00"),
                    "estimated_delivery_time_min": 16 + (offset % 10),
                    "estimated_delivery_time_max": 28 + (offset % 14),
                    "rating": Decimal(f"4.{82 + (offset % 12)}"),
                    "categories": [category_name],
                    "products": [
                        (
                            menu_category,
                            product_name,
                            f"{product_name} - preparat demo distinct pentru feed video.",
                            Decimal(f"{27 + product_idx + (offset % 5)}.00"),
                            Decimal(f"{24 + product_idx + (offset % 5)}.00") if product_idx in (3, 7) else None,
                            10 + ((offset + product_idx) % 12),
                            allergens,
                        )
                        for product_idx, product_name in enumerate(product_names, start=1)
                    ],
                }
            )

        demo_product_styles = ["Classic", "Spicy", "Smoky", "Crispy", "House", "Loaded", "Fresh", "Fire", "Signature", "Street"]
        demo_product_bases = [
            "Burger",
            "Pizza",
            "Pasta",
            "Ramen",
            "Bowl",
            "Wrap",
            "Salad",
            "Taco",
            "Quesadilla",
            "Soup",
            "Sandwich",
            "Schnitzel",
            "Rice Box",
            "Noodle Box",
            "Bao",
            "Dumplings",
            "Sushi Roll",
            "Poke",
            "Steak",
            "Wings",
            "Halloumi",
            "Falafel",
            "Shawarma",
            "Risotto",
            "Gnocchi",
            "Lasagna",
            "Kebab",
            "Burrito",
            "Udon",
            "Pho",
            "Maki",
            "Nigiri",
            "Bibimbap",
            "Curry",
            "Brisket",
            "Ribs",
        ]
        for restaurant_index, payload in enumerate(restaurants_payload, start=1):
            product_rows = payload["products"]
            existing_product_names = {row[1] for row in product_rows}
            fallback_category = product_rows[0][0] if product_rows else "Chef Picks"
            while len(product_rows) < 10:
                sequence = len(product_rows) + 1
                style = demo_product_styles[(sequence - 1) % len(demo_product_styles)]
                base_name = demo_product_bases[(restaurant_index * 7 + sequence * 3) % len(demo_product_bases)]
                product_name = f"{style} {base_name} {payload['slug']}"
                if product_name in existing_product_names:
                    product_name = f"{product_name} {sequence}"
                existing_product_names.add(product_name)
                base_price = Decimal(f"{24 + restaurant_index + sequence}.00")
                product_rows.append(
                    (
                        fallback_category,
                        product_name,
                        f"{product_name} - produs demo distinct pentru meniu extins.",
                        base_price,
                        base_price - Decimal("4.00") if sequence % 3 == 0 else None,
                        10 + ((restaurant_index + sequence) % 14),
                        "Poate contine alergeni",
                    )
                )

        pizza = None
        for payload in restaurants_payload:
            product_rows = payload.pop("products")
            category_names = payload.pop("categories")
            restaurant, _ = Restaurant.objects.get_or_create(
                slug=payload["slug"],
                defaults={
                    "owner": owner,
                    "supports_pickup": True,
                    "is_open": True,
                    "is_active": True,
                    **payload,
                },
            )
            restaurant.categories.set([category_map[name] for name in category_names])

            for idx, row in enumerate(product_rows, start=1):
                category_name, name, description, price, discount_price, prep_time, allergens = row
                ingredients = ingredient_profiles[(restaurant.id + idx) % len(ingredient_profiles)]
                calories = 360 + ((restaurant.id * 41 + idx * 57) % 640)
                menu_category, _ = ProductCategory.objects.get_or_create(
                    restaurant=restaurant,
                    name=category_name,
                    defaults={"sort_order": idx},
                )
                product, _ = Product.objects.get_or_create(
                    restaurant=restaurant,
                    name=name,
                    defaults={
                        "category": menu_category,
                        "description": description,
                        "price": price,
                        "discount_price": discount_price,
                        "is_available": True,
                        "is_popular": True,
                        "preparation_time": prep_time,
                        "allergens": allergens,
                        "ingredients": ingredients,
                        "calories": calories,
                    },
                )
                product.category = menu_category
                product.description = description
                product.price = price
                product.discount_price = discount_price
                product.preparation_time = prep_time
                product.allergens = allergens
                product.ingredients = ingredients
                product.calories = calories
                product.is_available = True
                product.is_popular = True
                product.save()
                if restaurant.slug == "luna-rossa-kitchen" and name == "Pizza Diavola":
                    pizza = product

        if pizza is None:
            pizza = Product.objects.filter(restaurant__slug="luna-rossa-kitchen", name="Pizza Diavola").first()

        if pizza:
            group, _ = ProductOptionGroup.objects.get_or_create(
                product=pizza,
                name="Extra",
                defaults={"is_required": False, "min_select": 0, "max_select": 3},
            )
            ProductOption.objects.get_or_create(
                option_group=group,
                name="Mozzarella extra",
                defaults={"extra_price": Decimal("6.00")},
            )
            ProductOption.objects.get_or_create(
                option_group=group,
                name="Salam picant extra",
                defaults={"extra_price": Decimal("8.00")},
            )

        address, _ = Address.objects.get_or_create(
            user=customer,
            label="Acasa",
            defaults={
                "full_name": "Client Demo",
                "phone": customer.phone,
                "address_line_1": "Strada General Berthelot 24",
                "city": "București",
                "postcode": "010164",
                "latitude": Decimal("44.444000"),
                "longitude": Decimal("26.091000"),
                "instructions": "Interfon 24, etaj 2",
                "is_default": True,
            },
        )
        profile, _ = CustomerProfile.objects.get_or_create(user=customer)
        profile.default_address = address
        profile.phone_number = customer.phone
        profile.save()

        PromoCode.objects.get_or_create(
            code="FIRSTCLUB",
            defaults={
                "discount_type": DiscountType.PERCENT,
                "discount_value": Decimal("10.00"),
                "min_order_value": Decimal("60.00"),
                "max_discount": Decimal("25.00"),
                "valid_from": timezone.now() - timezone.timedelta(days=1),
                "valid_until": timezone.now() + timezone.timedelta(days=90),
                "is_active": True,
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo data ready."))
