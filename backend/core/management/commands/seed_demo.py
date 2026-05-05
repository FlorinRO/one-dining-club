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

        italian, _ = RestaurantCategory.objects.get_or_create(name="Italian", defaults={"icon": "pizza"})
        restaurant, _ = Restaurant.objects.get_or_create(
            slug="luna-rossa-kitchen",
            defaults={
                "owner": owner,
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
                "is_open": True,
                "is_active": True,
            },
        )
        restaurant.categories.add(italian)

        pizza_category, _ = ProductCategory.objects.get_or_create(
            restaurant=restaurant,
            name="Pizza",
            defaults={"sort_order": 1},
        )
        pasta_category, _ = ProductCategory.objects.get_or_create(
            restaurant=restaurant,
            name="Pasta",
            defaults={"sort_order": 2},
        )

        pizza, _ = Product.objects.get_or_create(
            restaurant=restaurant,
            name="Pizza Diavola",
            defaults={
                "category": pizza_category,
                "description": "Sos San Marzano, mozzarella, salam picant, ardei iute si busuioc.",
                "price": Decimal("46.00"),
                "discount_price": Decimal("39.00"),
                "is_available": True,
                "is_popular": True,
                "preparation_time": 18,
                "allergens": "Gluten, lactoza",
            },
        )
        Product.objects.get_or_create(
            restaurant=restaurant,
            name="Tagliatelle Tartufo",
            defaults={
                "category": pasta_category,
                "description": "Tagliatelle, crema de parmezan, ciuperci si ulei de trufe.",
                "price": Decimal("52.00"),
                "is_available": True,
                "is_popular": True,
                "preparation_time": 16,
                "allergens": "Gluten, ou, lactoza",
            },
        )

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
                "city": "Bucuresti",
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

