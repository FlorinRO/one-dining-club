from django.test import TestCase
from rest_framework.test import APIClient

from addresses.models import Address
from menus.models import ProductCategory
from orders.models import Order, OrderStatus, PaymentMethod
from products.models import Product
from restaurants.models import Restaurant, RestaurantCategory, RestaurantOpeningHours
from users.models import User, UserRole


class RestaurantOwnerDashboardApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="owner-dashboard@example.com",
            password="StrongPass123!",
            role=UserRole.RESTAURANT_OWNER,
        )
        self.other_owner = User.objects.create_user(
            email="other-owner@example.com",
            password="StrongPass123!",
            role=UserRole.RESTAURANT_OWNER,
        )
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPass123!",
            role=UserRole.CUSTOMER,
        )
        self.restaurant_category = RestaurantCategory.objects.create(name="Asian", icon="bowl")
        self.restaurant = Restaurant.objects.create(
            owner=self.owner,
            name="Dashboard Kitchen",
            address="Strada Test 1",
            city="Bucuresti",
            email="owner@kitchen.test",
        )
        self.restaurant.categories.add(self.restaurant_category)
        self.product_category = ProductCategory.objects.create(
            restaurant=self.restaurant,
            name="Bowls",
            sort_order=1,
        )
        self.product = Product.objects.create(
            restaurant=self.restaurant,
            category=self.product_category,
            name="Spicy Bowl",
            price="35.00",
            is_available=True,
        )
        self.address = Address.objects.create(
            user=self.customer,
            label="Acasa",
            full_name="Client Test",
            phone="0712345678",
            address_line_1="Strada Client 4",
            city="Bucuresti",
        )
        Order.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            address=self.address,
            subtotal="35.00",
            delivery_fee="7.00",
            total="42.00",
            payment_method=PaymentMethod.CASH,
            order_status=OrderStatus.DELIVERED,
        )
        Order.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            address=self.address,
            subtotal="20.00",
            delivery_fee="5.00",
            total="25.00",
            payment_method=PaymentMethod.CASH,
            order_status=OrderStatus.PENDING,
        )
        self.client.force_authenticate(user=self.owner)

    def test_owner_can_update_restaurant_profile_and_hours(self):
        response = self.client.patch(
            f"/api/restaurant-owner/restaurants/{self.restaurant.id}/",
            {
                "description": "Profil complet pentru dashboard.",
                "promo_video_url": "https://cdn.yumzy.ro/videos/hero.mp4",
                "instagram_url": "https://instagram.com/yumzydemo",
                "tiktok_url": "https://tiktok.com/@yumzydemo",
                "categories": [self.restaurant_category.id],
                "opening_hours": [
                    {
                        "day_of_week": 0,
                        "opening_time": "09:00:00",
                        "closing_time": "18:00:00",
                        "is_closed": False,
                    },
                    {
                        "day_of_week": 1,
                        "opening_time": None,
                        "closing_time": None,
                        "is_closed": True,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.restaurant.refresh_from_db()
        self.assertEqual(self.restaurant.description, "Profil complet pentru dashboard.")
        self.assertEqual(self.restaurant.promo_video_url, "https://cdn.yumzy.ro/videos/hero.mp4")
        self.assertEqual(self.restaurant.instagram_url, "https://instagram.com/yumzydemo")
        self.assertEqual(self.restaurant.tiktok_url, "https://tiktok.com/@yumzydemo")
        self.assertEqual(RestaurantOpeningHours.objects.filter(restaurant=self.restaurant).count(), 2)

    def test_owner_overview_returns_metrics(self):
        response = self.client.get("/api/restaurant-owner/restaurants/overview/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        overview = payload[0]
        self.assertEqual(overview["products_count"], 1)
        self.assertEqual(overview["active_products_count"], 1)
        self.assertEqual(overview["orders_count"], 2)
        self.assertEqual(overview["pending_orders_count"], 1)
        self.assertEqual(overview["delivered_orders_count"], 1)
        self.assertEqual(overview["gross_revenue"], "42.00")

    def test_owner_dashboard_exposes_only_primary_restaurant(self):
        Restaurant.objects.create(
            owner=self.owner,
            name="Secondary Kitchen",
            address="Strada Test 2",
            city="Bucuresti",
        )

        response = self.client.get("/api/restaurant-owner/restaurants/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        results = payload["results"]
        self.assertEqual(payload["count"], 1)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.restaurant.id)

    def test_owner_cannot_create_second_restaurant(self):
        response = self.client.post(
            "/api/restaurant-owner/restaurants/",
            {
                "name": "Second Restaurant",
                "address": "Strada Noua 4",
                "city": "Brasov",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Restaurant.objects.filter(owner=self.owner).count(), 1)

    def test_owner_can_create_category_only_for_owned_restaurant(self):
        response = self.client.post(
            "/api/restaurant-owner/categories/",
            {
                "restaurant": self.restaurant.id,
                "name": "Desserts",
                "sort_order": 3,
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(ProductCategory.objects.filter(restaurant=self.restaurant, name="Desserts").exists())

    def test_owner_cannot_access_other_restaurant(self):
        other_restaurant = Restaurant.objects.create(
            owner=self.other_owner,
            name="Private Kitchen",
            address="Secret 8",
            city="Cluj",
        )

        response = self.client.patch(
            f"/api/restaurant-owner/restaurants/{other_restaurant.id}/",
            {"description": "nope"},
            format="json",
        )

        self.assertEqual(response.status_code, 404)
