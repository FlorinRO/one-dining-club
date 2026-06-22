from django.test import TestCase
from rest_framework.test import APIClient

from addresses.models import Address
from orders.models import FulfillmentType, Order
from products.models import Product
from restaurants.models import Restaurant
from users.models import User, UserRole


class OrderCreateApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            email="orders-customer@example.com",
            password="StrongPass123!",
            role=UserRole.CUSTOMER,
        )
        self.owner = User.objects.create_user(
            email="orders-owner@example.com",
            password="StrongPass123!",
            role=UserRole.RESTAURANT_OWNER,
        )
        self.restaurant = Restaurant.objects.create(
            owner=self.owner,
            name="Pickup Kitchen",
            address="Strada Restaurant 10",
            city="Bucuresti",
            supports_pickup=True,
            delivery_fee="12.00",
            minimum_order="0.00",
            is_open=True,
            is_active=True,
        )
        self.product = Product.objects.create(
            restaurant=self.restaurant,
            name="Burger Test",
            price="35.00",
            is_available=True,
        )
        self.address = Address.objects.create(
            user=self.customer,
            label="Acasa",
            full_name="Client Pickup",
            phone="0712345678",
            address_line_1="Strada Client 2",
            city="Bucuresti",
        )
        self.client.force_authenticate(user=self.customer)

    def test_pickup_order_can_be_created_without_address(self):
        response = self.client.post(
            "/api/orders/",
            {
                "restaurant_id": self.restaurant.id,
                "fulfillment_type": FulfillmentType.PICKUP,
                "payment_method": "cash",
                "items": [
                    {
                        "product_id": self.product.id,
                        "quantity": 1,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get()
        self.assertEqual(order.fulfillment_type, FulfillmentType.PICKUP)
        self.assertIsNone(order.address)
        self.assertEqual(str(order.delivery_fee), "0.00")

    def test_delivery_order_requires_address(self):
        response = self.client.post(
            "/api/orders/",
            {
                "restaurant_id": self.restaurant.id,
                "fulfillment_type": FulfillmentType.DELIVERY,
                "payment_method": "cash",
                "items": [
                    {
                        "product_id": self.product.id,
                        "quantity": 1,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"address_id": ["Address is required for delivery orders."]})

    def test_delivery_order_with_address_is_still_supported(self):
        response = self.client.post(
            "/api/orders/",
            {
                "restaurant_id": self.restaurant.id,
                "address_id": self.address.id,
                "payment_method": "cash",
                "items": [
                    {
                        "product_id": self.product.id,
                        "quantity": 1,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        order = Order.objects.order_by("-id").first()
        self.assertEqual(order.fulfillment_type, FulfillmentType.DELIVERY)
        self.assertEqual(order.address_id, self.address.id)
        self.assertEqual(str(order.delivery_fee), "12.00")
