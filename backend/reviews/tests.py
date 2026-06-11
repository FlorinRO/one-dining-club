from django.test import TestCase
from rest_framework.test import APIClient

from addresses.models import Address
from orders.models import Order, OrderStatus, PaymentMethod
from restaurants.models import Restaurant
from reviews.models import Review
from users.models import User, UserRole


class ReviewApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="owner-reviews@example.com",
            password="StrongPass123!",
            role=UserRole.RESTAURANT_OWNER,
        )
        self.customer = User.objects.create_user(
            email="customer-reviews@example.com",
            password="StrongPass123!",
            role=UserRole.CUSTOMER,
        )
        self.restaurant = Restaurant.objects.create(
            owner=self.owner,
            name="Rating Kitchen",
            address="Strada Rating 1",
            city="Bucuresti",
        )
        self.address = Address.objects.create(
            user=self.customer,
            label="Acasa",
            full_name="Client Review",
            phone="0712345678",
            address_line_1="Strada Client 9",
            city="Bucuresti",
        )
        self.delivered_order = Order.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            address=self.address,
            subtotal="50.00",
            delivery_fee="7.00",
            total="57.00",
            payment_method=PaymentMethod.CASH,
            order_status=OrderStatus.DELIVERED,
        )
        self.pending_order = Order.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            address=self.address,
            subtotal="50.00",
            delivery_fee="7.00",
            total="57.00",
            payment_method=PaymentMethod.CASH,
            order_status=OrderStatus.PENDING,
        )
        self.client.force_authenticate(user=self.customer)

    def test_customer_can_review_delivered_order_and_rating_updates(self):
        response = self.client.post(
            f"/api/orders/{self.delivered_order.id}/review/",
            {"rating": 5, "comment": "Excelent."},
            format="json",
        )
        restaurant_response = self.client.get(f"/api/restaurants/{self.restaurant.id}/")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["rating"], 5)
        self.restaurant.refresh_from_db()
        self.assertEqual(float(self.restaurant.rating), 5.0)
        self.assertEqual(restaurant_response.json()["reviews_count"], 1)
        self.assertEqual(Review.objects.count(), 1)

    def test_customer_cannot_review_pending_order(self):
        response = self.client.post(
            f"/api/orders/{self.pending_order.id}/review/",
            {"rating": 4, "comment": "Inca astept."},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Review.objects.exists())
