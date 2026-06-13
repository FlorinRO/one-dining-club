from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import connection
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
        def build_description(name, restaurant_name):
            return f"{name} - preparat signature de la {restaurant_name}."

        def insert_product_with_current_schema(
            *,
            restaurant_id,
            category_id,
            name,
            description,
            price,
            discount_price,
            preparation_time,
            allergens,
            ingredients,
            calories,
        ):
            now = timezone.now()
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO products_product (
                        name, description, image, price, discount_price, is_available, is_popular,
                        preparation_time, allergens, created_at, updated_at, category_id, restaurant_id,
                        calories, ingredients, audio_url, has_audio, video_url
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    [
                        name,
                        description,
                        None,
                        price,
                        discount_price,
                        True,
                        True,
                        preparation_time,
                        allergens,
                        now,
                        now,
                        category_id,
                        restaurant_id,
                        calories,
                        ingredients,
                        None,
                        False,
                        None,
                    ],
                )
                return cursor.fetchone()[0]

        feed_name_overrides = {
            "wok-yard": {
                "name": "Bolul Dragonului",
                "description": "Bowl-uri asiatice, ramen și gustări cu influențe orientale.",
                "rating": Decimal("4.99"),
                "products": [
                    "Stridii Royale",
                    "Bol Asiatic",
                    "Rulouri Crocante",
                    "Ramen Clasic",
                ],
                "product_descriptions": [
                    build_description("Stridii Royale", "Bolul Dragonului"),
                    build_description("Bol Asiatic", "Bolul Dragonului"),
                    build_description("Rulouri Crocante", "Bolul Dragonului"),
                    build_description("Ramen Clasic", "Bolul Dragonului"),
                ],
                "product_videos": {
                    "Stridii Royale": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/ASIATIC-FOOD/ASIATIC-FOOD-oyster-eating.mp4",
                    "Bol Asiatic": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/ASIATIC-FOOD/ASIATIC-FOOD-ramen-chopsticks.mp4",
                    "Rulouri Crocante": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/ASIATIC-FOOD/ASIATIC-FOOD-spring-rolls.mp4",
                    "Ramen Clasic": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/ASIATIC-FOOD/ASIATIC-FOOD-vitnamese-soup.mp4",
                },
            },
            "market-brunch-club": {
                "name": "Brunch Atelier",
                "description": "Brunch all-day, deserturi și preparate lejere de dimineață.",
                "rating": Decimal("4.98"),
                "products": [
                    "Gogoașă cu Cremă & Nuci",
                    "Omletă Fresh",
                ],
                "product_descriptions": [
                    build_description("Gogoașă cu Cremă & Nuci", "Brunch Atelier"),
                    build_description("Omletă Fresh", "Brunch Atelier"),
                ],
                "product_videos": {
                    "Gogoașă cu Cremă & Nuci": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/BRAKEFAST-FOOD/BRAKEFAST-FOOD-desert-donut.mp4",
                    "Omletă Fresh": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/BRAKEFAST-FOOD/BRAKEFAST-FOOD-ommlete-fork.mp4",
                },
            },
            "burger-craft": {
                "name": "Burger Forge",
                "description": "Burgeri artizanali, sosuri intense și combinații îndrăznețe.",
                "rating": Decimal("4.97"),
                "products": [
                    "Fire Burger",
                    "Burger Red Bun",
                    "Burger Samurai Egg",
                ],
                "product_descriptions": [
                    build_description("Fire Burger", "Burger Forge"),
                    build_description("Burger Red Bun", "Burger Forge"),
                    build_description("Burger Samurai Egg", "Burger Forge"),
                ],
                "product_videos": {
                    "Fire Burger": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/BURGER-FOOD/BURGER-FOOD-burger-in-flames.mp4",
                    "Burger Red Bun": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/BURGER-FOOD/BURGER-FOOD-red-burger.mp4",
                    "Burger Samurai Egg": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/BURGER-FOOD/BURGER-FOOD-sauce-pouring-over-burger.mp4",
                },
            },
            "smokehouse-loop": {
                "name": "Grill Orient",
                "description": "Grill oriental cu preparate rumenite și arome intense.",
                "rating": Decimal("4.96"),
                "products": [
                    "Frigărui Teriyaki",
                    "Grill Picant",
                    "Pește în Sos Oriental",
                ],
                "product_descriptions": [
                    build_description("Frigărui Teriyaki", "Grill Orient"),
                    build_description("Grill Picant", "Grill Orient"),
                    build_description("Pește în Sos Oriental", "Grill Orient"),
                ],
                "product_videos": {
                    "Frigărui Teriyaki": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/GRILLED-FOOD/GRILLED-FOOD-frigarui-orez.mp4",
                    "Grill Picant": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/GRILLED-FOOD/GRILLED-FOOD-grilled-buns.mp4",
                    "Pește în Sos Oriental": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/GRILLED-FOOD/GRILLED-FOOD-sea-food-fish-dish.mp4",
                },
            },
            "mediterraneo": {
                "name": "Sultan Grill",
                "description": "Kebab, mix grill și preparate orientale consistente.",
                "rating": Decimal("4.95"),
                "products": [
                    "Kebab Regal",
                    "Mix Grill Sultan",
                ],
                "product_descriptions": [
                    build_description("Kebab Regal", "Sultan Grill"),
                    build_description("Mix Grill Sultan", "Sultan Grill"),
                ],
                "product_videos": {
                    "Kebab Regal": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/KEBAB-FOOD/KEBAB-FOOD-eating-girl.mp4",
                    "Mix Grill Sultan": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/KEBAB-FOOD/KEBAB-FOODfancy-kebab.mp4",
                },
            },
            "levant-reel-kitchen": {
                "name": "Levant Bistro",
                "description": "Hummus, lipii și gusturi levantine autentice.",
                "rating": Decimal("4.94"),
                "products": [
                    "Trio Hummus",
                    "Hummus cu Lipie",
                ],
                "product_descriptions": [
                    build_description("Trio Hummus", "Levant Bistro"),
                    build_description("Hummus cu Lipie", "Levant Bistro"),
                ],
                "product_videos": {
                    "Trio Hummus": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/ORIENTAL-FOOD/ORIENTAL-FOOD-hummus.mp4",
                    "Hummus cu Lipie": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/ORIENTAL-FOOD/ORIENTAL-FOOD-lebanese-humus.mp4",
                },
            },
            "carbonara-cut": {
                "name": "Pasta Vita",
                "description": "Paste cremoase, rețete italiene și porții generoase.",
                "rating": Decimal("4.93"),
                "products": [
                    "Tagliatelle Carbonara",
                    "Spaghete cu Scoici",
                ],
                "product_descriptions": [
                    build_description("Tagliatelle Carbonara", "Pasta Vita"),
                    build_description("Spaghete cu Scoici", "Pasta Vita"),
                ],
                "product_videos": {
                    "Tagliatelle Carbonara": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/PASTA-FOOD/PASTA-FOOD-Creammy-tagliatele.mp4",
                    "Spaghete cu Scoici": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/PASTA-FOOD/PASTA-FOOD-pasta-clams.mp4",
                },
            },
            "luna-rossa-kitchen": {
                "name": "Pizzeria Napoli",
                "description": "Pizza și focaccia cu topping-uri italiene clasice.",
                "rating": Decimal("4.92"),
                "products": [
                    "Focaccia Italiană",
                    "Pizza Marinara",
                    "Pizza Mediteraneană",
                ],
                "product_descriptions": [
                    build_description("Focaccia Italiană", "Pizzeria Napoli"),
                    build_description("Pizza Marinara", "Pizzeria Napoli"),
                    build_description("Pizza Mediteraneană", "Pizzeria Napoli"),
                ],
                "product_videos": {
                    "Focaccia Italiană": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/PIZZA-FOOD/PIZZA-FOOD-cheese-chicken.mp4",
                    "Pizza Marinara": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/PIZZA-FOOD/PIZZA-FOOD-kettle.mp4",
                    "Pizza Mediteraneană": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/PIZZA-FOOD/PIZZA-FOOD-pizza-sharing.mp4",
                },
            },
            "green-fork": {
                "name": "Blue Coast",
                "description": "Preparate marine, pește și salate fresh cu fructe de mare.",
                "rating": Decimal("4.91"),
                "products": [
                    "Pește la Cuptor",
                    "Salată cu Creveți",
                ],
                "product_descriptions": [
                    build_description("Pește la Cuptor", "Blue Coast"),
                    build_description("Salată cu Creveți", "Blue Coast"),
                ],
                "product_videos": {
                    "Pește la Cuptor": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/SEA-FOOD/SEA-FOOD-fish-plate.mp4",
                    "Salată cu Creveți": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/SEA-FOOD/sea-food-mixing.mp4",
                },
            },
            "bowl-motion": {
                "name": "Wok Fusion",
                "description": "Wok, stir fry și combinații asiatice cu texturi contrastante.",
                "rating": Decimal("4.90"),
                "products": [
                    "Stir Fry cu Pui",
                    "Legume Gratin",
                    "Trio de Carne",
                ],
                "product_descriptions": [
                    build_description("Stir Fry cu Pui", "Wok Fusion"),
                    build_description("Legume Gratin", "Wok Fusion"),
                    build_description("Trio de Carne", "Wok Fusion"),
                ],
                "product_videos": {
                    "Stir Fry cu Pui": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/STIRFRY-FOOD/STIRFRY-FOOD-asian-grill-chiken.mp4",
                    "Legume Gratin": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/STIRFRY-FOOD/STIRFRY-FOOD-shrimp-pasta.mp4",
                    "Trio de Carne": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/STIRFRY-FOOD/STIRFRY-FOOD-tacos-tasty.mp4",
                },
            },
            "neon-taco-bar": {
                "name": "Taco Fiesta",
                "description": "Tacos fresh și combinații mexicane rapide, pline de culoare.",
                "rating": Decimal("4.89"),
                "products": [
                    "Tacos Fresh",
                    "Tacos cu Orez",
                ],
                "product_descriptions": [
                    build_description("Tacos Fresh", "Taco Fiesta"),
                    build_description("Tacos cu Orez", "Taco Fiesta"),
                ],
                "product_videos": {
                    "Tacos Fresh": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/TACOS-FOOD/TACOS-FOOD-on-wooden-table.mp4",
                    "Tacos cu Orez": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/TACOS-FOOD/TACOS-FOOD-tacos-mania.mp4",
                },
            },
            "sushi-loop": {
                "name": "Sakura Flame",
                "description": "Sushi flambat și rulouri japoneze cu plating spectaculos.",
                "rating": Decimal("4.88"),
                "products": [
                    "Sushi în Flăcări",
                    "Sushi cu Susan",
                ],
                "product_descriptions": [
                    build_description("Sushi în Flăcări", "Sakura Flame"),
                    build_description("Sushi cu Susan", "Sakura Flame"),
                ],
                "product_videos": {
                    "Sushi în Flăcări": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/SUSHI-FOOD/SUSHI-FOOD-flamed-sushi.mp4",
                    "Sushi cu Susan": "https://pub-315b5aea2f0c435798a36c40bb0eb6e5.r2.dev/videos-yumzy/SUSHI-FOOD/SUSHI-FOOD-sesames.mp4",
                },
            },
        }

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
            email="demo@yumzy.ro",
            defaults={
                "first_name": "Client",
                "last_name": "Demo",
                "phone": "+40720000000",
                "role": UserRole.CUSTOMER,
            },
        )
        customer.set_password("password123")
        customer.is_active = True
        customer.save()
        CustomerProfile.objects.get_or_create(user=customer, defaults={"phone_number": customer.phone})

        owner, _ = User.objects.get_or_create(
            email="owner@yumzy.ro",
            defaults={
                "first_name": "Restaurant",
                "last_name": "Owner",
                "phone": "+40721111111",
                "role": UserRole.RESTAURANT_OWNER,
            },
        )
        owner.set_password("password123")
        owner.is_active = True
        owner.save()

        Restaurant.objects.filter(
            slug__in=[
                "bao-pop-studio",
                "bagel-bros",
                "crispy-seoul-lab",
                "curry-house",
                "fit-kitchen",
                "gelato-lab",
                "pasta-fresca",
                "pho-station",
                "smash-brothers",
                "taco-loco",
                "umami-reels",
                "dolce-notte",
                "gelato-stories",
            ]
        ).delete()

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
        ]
        generated_payload = [
            ("sushi-loop", "Sushi Loop", "Sushi si poke fresh.", "Asian", "Sushi", "Salmon Nigiri", "Poke Bowl"),
            ("mediterraneo", "Mediterraneo", "Greci, grill si salate.", "Healthy", "Grill", "Chicken Souvlaki", "Greek Salad"),
            ("burger-craft", "Burger Craft", "Burgeri premium si loaded fries.", "Burgers", "Burgers", "Classic Cheeseburger", "Truffle Fries"),
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
                    "name": feed_name_overrides.get(slug, {}).get("name", name),
                    "description": feed_name_overrides.get(slug, {}).get("description", description),
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
                            feed_name_overrides.get(slug, {}).get("products", product_names)[product_idx - 1]
                            if product_idx <= len(feed_name_overrides.get(slug, {}).get("products", []))
                            else product_name,
                            f"{(feed_name_overrides.get(slug, {}).get('products', product_names)[product_idx - 1] if product_idx <= len(feed_name_overrides.get(slug, {}).get('products', [])) else product_name)} - preparat demo distinct pentru feed video.",
                            Decimal(f"{27 + product_idx + (offset % 5)}.00"),
                            Decimal(f"{24 + product_idx + (offset % 5)}.00") if product_idx in (3, 7) else None,
                            10 + ((offset + product_idx) % 12),
                            allergens,
                        )
                        for product_idx, product_name in enumerate(product_names, start=1)
                    ],
                }
            )

        restaurants_payload.append(
            {
                "slug": "glow-market",
                "name": "Glow Market",
                "entity_type": Restaurant.EntityType.BRAND,
                "is_sponsored": True,
                "description": "Brand partener cu snack-uri proteice, băuturi funcționale și pachete promo cumpărabile direct din feed.",
                "phone": "+40728999160",
                "email": "hello@glow-market.test",
                "address": "Calea Dorobanti 55",
                "city": "Bucuresti",
                "latitude": Decimal("44.451000"),
                "longitude": Decimal("26.098000"),
                "delivery_fee": Decimal("0.00"),
                "minimum_order": Decimal("35.00"),
                "estimated_delivery_time_min": 18,
                "estimated_delivery_time_max": 30,
                "rating": Decimal("4.99"),
                "categories": ["Brand"],
                "products": [
                    (
                        "Featured drops",
                        "Protein Crunch Box",
                        "Mix de batoane proteice, chipsuri high-protein si sosuri dulci-sarate pentru snack rapid.",
                        Decimal("39.00"),
                        Decimal("33.00"),
                        8,
                        "Arahide, soia",
                    ),
                    (
                        "Featured drops",
                        "Hydration Energy Pack",
                        "Pachet promo cu apa vitaminizata, energy gummies si electroliti pentru antrenament sau office.",
                        Decimal("31.00"),
                        None,
                        6,
                        "Poate contine urme de fructe cu coaja",
                    ),
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

        for payload in restaurants_payload:
            override = feed_name_overrides.get(payload["slug"])
            if not override:
                continue
            payload["name"] = override["name"]
            payload["description"] = override["description"]
            payload["rating"] = override["rating"]
            for product_index, override_name in enumerate(override["products"]):
                if product_index >= len(payload["products"]):
                    break
                category_name, _, _, price, discount_price, prep_time, allergens = payload["products"][product_index]
                if product_index < len(override["products"]):
                    category_name = f"Selecția {product_index + 1}"
                product_description = override.get("product_descriptions", [])[product_index] if product_index < len(override.get("product_descriptions", [])) else f"{override_name} - preparat demo distinct pentru feed video."
                payload["products"][product_index] = (
                    category_name,
                    override_name,
                    product_description,
                    price,
                    discount_price,
                    prep_time,
                    allergens,
                )

        pizza = None
        for payload in restaurants_payload:
            product_rows = payload.pop("products")
            category_names = payload.pop("categories")
            restaurant, _ = Restaurant.objects.get_or_create(
                slug=payload["slug"],
                defaults={
                    "owner": owner,
                    "entity_type": payload.get("entity_type", Restaurant.EntityType.RESTAURANT),
                    "is_sponsored": payload.get("is_sponsored", False),
                    "supports_pickup": True,
                    "is_open": True,
                    "is_active": True,
                    **payload,
                },
            )
            restaurant.owner = owner
            restaurant.entity_type = payload.get("entity_type", Restaurant.EntityType.RESTAURANT)
            restaurant.is_sponsored = payload.get("is_sponsored", False)
            restaurant.supports_pickup = True
            restaurant.is_open = True
            restaurant.is_active = True
            restaurant.name = payload["name"]
            restaurant.description = payload["description"]
            restaurant.phone = payload["phone"]
            restaurant.email = payload["email"]
            restaurant.address = payload["address"]
            restaurant.city = payload["city"]
            restaurant.latitude = payload["latitude"]
            restaurant.longitude = payload["longitude"]
            restaurant.delivery_fee = payload["delivery_fee"]
            restaurant.minimum_order = payload["minimum_order"]
            restaurant.estimated_delivery_time_min = payload["estimated_delivery_time_min"]
            restaurant.estimated_delivery_time_max = payload["estimated_delivery_time_max"]
            restaurant.rating = payload["rating"]
            restaurant.save()
            restaurant.categories.set([category_map[name] for name in category_names])

            existing_products = list(
                Product.objects.filter(restaurant=restaurant).select_related("category").order_by("id")
            )

            for idx, row in enumerate(product_rows, start=1):
                category_name, name, description, price, discount_price, prep_time, allergens = row
                override = feed_name_overrides.get(payload["slug"])
                override_product_count = len(override["products"]) if override else 0
                should_keep_available = payload["slug"] not in feed_name_overrides or idx <= override_product_count
                ingredients = ingredient_profiles[(restaurant.id + idx) % len(ingredient_profiles)]
                calories = 360 + ((restaurant.id * 41 + idx * 57) % 640)
                menu_category, _ = ProductCategory.objects.get_or_create(
                    restaurant=restaurant,
                    name=category_name,
                    defaults={"sort_order": idx},
                )
                if menu_category.sort_order != idx:
                    menu_category.sort_order = idx
                    menu_category.save(update_fields=["sort_order"])

                if idx > len(existing_products):
                    product_id = insert_product_with_current_schema(
                        restaurant_id=restaurant.id,
                        category_id=menu_category.id,
                        name=name,
                        description=description,
                        price=price,
                        discount_price=discount_price,
                        preparation_time=prep_time,
                        allergens=allergens,
                        ingredients=ingredients,
                        calories=calories,
                    )
                    product = Product.objects.get(pk=product_id)
                    product.video_url = override["product_videos"].get(name) if override else None
                    if not should_keep_available:
                        product.is_available = False
                        product.is_popular = False
                        product.save(update_fields=["video_url", "is_available", "is_popular"])
                    else:
                        product.save(update_fields=["video_url"])
                    if restaurant.slug == "luna-rossa-kitchen" and name == "Pizza Diavola":
                        pizza = product
                    continue

                product = existing_products[idx - 1]
                product.name = name
                product.category = menu_category
                product.description = description
                product.price = price
                product.discount_price = discount_price
                product.preparation_time = prep_time
                product.allergens = allergens
                product.ingredients = ingredients
                product.calories = calories
                product.video_url = override["product_videos"].get(name) if override else None
                product.is_available = should_keep_available
                product.is_popular = should_keep_available
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
