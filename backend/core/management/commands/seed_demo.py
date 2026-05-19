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
                    },
                )
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
