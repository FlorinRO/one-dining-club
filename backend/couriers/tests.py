from django.test import TestCase
from rest_framework.test import APIClient

from addresses.models import Address
from couriers.models import CourierProfile, Delivery, DeliveryStatus
from orders.models import FulfillmentType, Order, OrderStatus
from restaurants.models import Restaurant
from users.models import User, UserRole


class CourierApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.courier = User.objects.create_user(
            email="courier@example.com",
            password="StrongPass123!",
            role=UserRole.COURIER,
            first_name="Ana",
            last_name="Livrare",
            phone="0711111111",
        )
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPass123!",
            role=UserRole.CUSTOMER,
        )
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="StrongPass123!",
            role=UserRole.RESTAURANT_OWNER,
        )
        self.restaurant = Restaurant.objects.create(
            owner=self.owner,
            name="Courier Kitchen",
            address="Strada Test 1",
            city="Bucuresti",
            supports_pickup=True,
            delivery_fee="10.00",
            minimum_order="0.00",
            is_open=True,
            is_active=True,
            latitude="44.426800",
            longitude="26.102500",
        )
        self.address = Address.objects.create(
            user=self.customer,
            label="Acasa",
            full_name="Client Test",
            phone="0722222222",
            address_line_1="Strada Client 3",
            city="Bucuresti",
            latitude="44.439663",
            longitude="26.096306",
        )
        self.order = Order.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            address=self.address,
            subtotal="35.00",
            delivery_fee="10.00",
            total="45.00",
            fulfillment_type=FulfillmentType.DELIVERY,
            order_status=OrderStatus.READY_FOR_PICKUP,
        )
        self.client.force_authenticate(user=self.courier)

    def test_courier_profile_get_bootstraps_defaults(self):
        response = self.client.get("/api/courier/location/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["email"], self.courier.email)
        self.assertEqual(payload["phone"], self.courier.phone)
        self.assertEqual(payload["vehicle_type"], "bike")
        self.assertFalse(payload["is_available"])

    def test_courier_profile_patch_updates_profile_fields(self):
        response = self.client.patch(
            "/api/courier/location/",
            {
                "phone": "0733333333",
                "vehicle_type": "scooter",
                "current_latitude": "44.430100",
                "current_longitude": "26.100200",
                "is_available": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        profile = CourierProfile.objects.get(user=self.courier)
        self.assertEqual(profile.phone, "0733333333")
        self.assertEqual(profile.vehicle_type, "scooter")
        self.assertTrue(profile.is_available)
        self.assertEqual(str(profile.current_latitude), "44.430100")
        self.assertEqual(str(profile.current_longitude), "26.100200")

    def test_courier_accept_assigns_order_without_advancing_delivery_status_flow(self):
        response = self.client.patch(f"/api/courier/orders/{self.order.id}/accept/")

        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        delivery = Delivery.objects.get(order=self.order)
        self.assertEqual(self.order.courier_id, self.courier.id)
        self.assertEqual(self.order.order_status, OrderStatus.READY_FOR_PICKUP)
        self.assertEqual(delivery.status, DeliveryStatus.ASSIGNED)
        self.assertIsNone(delivery.pickup_time)
