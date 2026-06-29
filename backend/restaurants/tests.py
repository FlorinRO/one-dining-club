from django.test import TestCase
from rest_framework.test import APIClient
from unittest.mock import patch

from addresses.models import Address
from menus.models import ProductCategory
from orders.models import Order, OrderStatus, PaymentMethod, PaymentStatus
from products.models import Product
from restaurants.forms import RestaurantAdminForm
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

    def test_owner_overview_ignores_unpaid_online_orders(self):
        Order.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            address=self.address,
            subtotal="99.00",
            delivery_fee="0.00",
            total="99.00",
            payment_method=PaymentMethod.CARD,
            payment_status=PaymentStatus.PENDING,
            order_status=OrderStatus.PENDING,
        )

        response = self.client.get("/api/restaurant-owner/restaurants/overview/")

        self.assertEqual(response.status_code, 200)
        overview = response.json()[0]
        self.assertEqual(overview["orders_count"], 2)
        self.assertEqual(overview["pending_orders_count"], 1)

    def test_owner_can_publish_restaurant_to_public_app(self):
        self.restaurant.is_active = False
        self.restaurant.save(update_fields=("is_active", "updated_at"))

        hidden_response = self.client.get("/api/restaurants/")
        hidden_ids = [item["id"] for item in hidden_response.json()["results"]]
        self.assertNotIn(self.restaurant.id, hidden_ids)

        response = self.client.patch(
            f"/api/restaurant-owner/restaurants/{self.restaurant.id}/",
            {"is_active": True},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.restaurant.refresh_from_db()
        self.assertTrue(self.restaurant.is_active)

        public_response = self.client.get("/api/restaurants/")
        public_ids = [item["id"] for item in public_response.json()["results"]]
        self.assertIn(self.restaurant.id, public_ids)

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

    def test_owner_cannot_change_name_and_city_after_creation(self):
        response = self.client.patch(
            f"/api/restaurant-owner/restaurants/{self.restaurant.id}/",
            {
                "name": "Alt nume",
                "city": "Cluj",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertIn("name", payload)
        self.assertIn("city", payload)

    def test_owner_can_change_address_for_testing(self):
        response = self.client.patch(
            f"/api/restaurant-owner/restaurants/{self.restaurant.id}/",
            {
                "address": "Altă adresă 99",
                "latitude": "44.4479231234",
                "longitude": "26.0978799876",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.restaurant.refresh_from_db()
        self.assertEqual(self.restaurant.address, "Altă adresă 99")
        self.assertEqual(str(self.restaurant.latitude), "44.447923")
        self.assertEqual(str(self.restaurant.longitude), "26.097880")

    def test_owner_restaurant_payload_exposes_identity_lock_state(self):
        response = self.client.get("/api/restaurant-owner/restaurants/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["results"][0]["identity_details_locked"])

    def test_owner_cannot_set_extreme_operational_values(self):
        response = self.client.patch(
            f"/api/restaurant-owner/restaurants/{self.restaurant.id}/",
            {
                "delivery_fee": "99.00",
                "minimum_order": "1000.00",
                "estimated_delivery_time_min": 5,
                "estimated_delivery_time_max": 240,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertIn("delivery_fee", payload)
        self.assertIn("minimum_order", payload)
        self.assertIn("estimated_delivery_time_min", payload)
        self.assertIn("estimated_delivery_time_max", payload)

    def test_owner_cannot_set_delivery_max_below_min(self):
        response = self.client.patch(
            f"/api/restaurant-owner/restaurants/{self.restaurant.id}/",
            {
                "estimated_delivery_time_min": 45,
                "estimated_delivery_time_max": 20,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("estimated_delivery_time_max", response.json())


class RestaurantPublicVisibilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="visibility-owner@example.com",
            password="StrongPass123!",
            role=UserRole.RESTAURANT_OWNER,
        )

    def test_public_restaurant_list_hides_restaurants_without_available_products(self):
        hidden_restaurant = Restaurant.objects.create(
            owner=self.owner,
            name="No Products Yet",
            address="Strada Test 10",
            city="Bucuresti",
            is_active=True,
        )
        hidden_with_unavailable_product = Restaurant.objects.create(
            owner=self.owner,
            name="Unavailable Menu",
            address="Strada Test 11",
            city="Bucuresti",
            is_active=True,
        )
        visible_restaurant = Restaurant.objects.create(
            owner=self.owner,
            name="Visible Menu",
            address="Strada Test 12",
            city="Bucuresti",
            is_active=True,
        )

        Product.objects.create(
            restaurant=hidden_with_unavailable_product,
            name="Hidden Burger",
            price="20.00",
            is_available=False,
        )
        Product.objects.create(
            restaurant=visible_restaurant,
            name="Visible Burger",
            price="22.00",
            is_available=True,
        )

        response = self.client.get("/api/restaurants/")

        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.json()["results"]]
        self.assertNotIn(hidden_restaurant.id, ids)
        self.assertNotIn(hidden_with_unavailable_product.id, ids)
        self.assertIn(visible_restaurant.id, ids)


class RestaurantAdminProvisioningTests(TestCase):
    @patch("restaurants.forms.send_password_reset_email")
    def test_admin_form_creates_restaurant_owner_from_email_and_sends_setup_email(self, mock_send_password_reset_email):
        form = RestaurantAdminForm(
            data={
                "name": "Setup Kitchen",
                "address": "Strada Setup 15",
                "city": "Bucuresti",
                "owner_email": "setup-owner@example.com",
                "send_setup_email": "on",
                "entity_type": "restaurant",
                "sponsored_mode": "native",
                "delivery_fee": "0.00",
                "minimum_order": "0.00",
                "estimated_delivery_time_min": 25,
                "estimated_delivery_time_max": 45,
                "rating": "0.00",
            }
        )

        self.assertTrue(form.is_valid(), form.errors)
        restaurant = form.save()

        owner = User.objects.get(email="setup-owner@example.com")
        self.assertEqual(owner.role, UserRole.RESTAURANT_OWNER)
        self.assertTrue(owner.is_active)
        self.assertFalse(owner.has_usable_password())
        self.assertEqual(restaurant.owner, owner)
        self.assertEqual(restaurant.email, owner.email)
        mock_send_password_reset_email.assert_called_once_with(
            owner,
            subject="Activează contul restaurantului în Yumzy",
            headline="Activează contul restaurantului",
            body=(
                f"Contul pentru {restaurant.name} este pregătit. "
                "Apasă pe butonul de mai jos pentru a seta parola și a intra în dashboard."
            ),
            button_label="Activează contul",
            footnote="Dacă nu te așteptai la acest mesaj, contactează echipa Yumzy.",
            intro_message=f"Contul restaurantului {restaurant.name} a fost creat în Yumzy.",
        )
