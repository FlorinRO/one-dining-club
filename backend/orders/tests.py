from django.test import TestCase
from rest_framework.test import APIClient
from unittest.mock import patch

from addresses.models import Address
from orders.models import FulfillmentType, Order, OrderStatus
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
            image="products/burger-test.jpg",
            video_url="https://cdn.example.com/burger-test.mp4",
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

    def test_order_list_includes_ordered_product_media(self):
        self.client.post(
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

        response = self.client.get("/api/orders/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        orders = payload["results"] if isinstance(payload, dict) else payload
        order_item = orders[0]["items"][0]
        self.assertEqual(order_item["product"], self.product.id)
        self.assertEqual(order_item["product_name"], "Burger Test")
        self.assertTrue(order_item["product_image"].endswith("/media/products/burger-test.jpg"))
        self.assertEqual(order_item["product_video_url"], "https://cdn.example.com/burger-test.mp4")

    def test_order_create_push_notification_is_customer_facing(self):
        with patch("orders.notifications.send_push_to_user") as mock_send:
            with self.captureOnCommitCallbacks(execute=True):
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
        order = Order.objects.order_by("-id").first()
        customer_call = mock_send.call_args_list[0]
        args, kwargs = customer_call
        self.assertEqual(args[0], self.customer)
        self.assertEqual(kwargs["title"], "Comanda plasata cu succes")
        self.assertEqual(
            kwargs["body"],
            f"Comanda #{order.id} a fost plasata cu succes la {self.restaurant.name}.",
        )
        self.assertEqual(kwargs["data"]["order_id"], order.id)

    def test_restaurant_status_update_queues_customer_push_notification(self):
        order = Order.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            address=self.address,
            subtotal="35.00",
            delivery_fee="12.00",
            total="47.00",
        )
        self.client.force_authenticate(user=self.owner)

        with patch("orders.notifications.send_push_to_user") as mock_send:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.patch(
                    f"/api/restaurant-owner/orders/{order.id}/status/",
                    {"order_status": OrderStatus.ACCEPTED},
                    format="json",
                )

        self.assertEqual(response.status_code, 200)
        mock_send.assert_called_once()
        args, kwargs = mock_send.call_args
        self.assertEqual(args[0], self.customer)
        self.assertEqual(kwargs["title"], "Comanda a fost acceptata")
        self.assertEqual(kwargs["data"]["order_id"], order.id)
