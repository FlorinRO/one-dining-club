from datetime import datetime, time, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from addresses.models import Address
from couriers.models import (
    CourierAvailabilitySession,
    CourierDocument,
    CourierOperationEntry,
    CourierProfile,
    CourierSupportTicket,
    Delivery,
    DeliveryStatus,
)
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
        self.assertTrue(payload["app_notifications_enabled"])
        self.assertTrue(payload["route_alerts_enabled"])
        self.assertEqual(payload["preferred_navigation_app"], "google_maps")
        self.assertEqual(payload["app_language"], "ro")
        self.assertEqual(payload["completed_deliveries_total"], 0)

    def test_courier_profile_patch_updates_profile_fields(self):
        response = self.client.patch(
            "/api/courier/location/",
            {
                "phone": "0733333333",
                "vehicle_type": "scooter",
                "current_latitude": "44.430100",
                "current_longitude": "26.100200",
                "is_available": True,
                "app_notifications_enabled": False,
                "route_alerts_enabled": False,
                "preferred_navigation_app": "waze",
                "app_language": "en",
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
        self.assertFalse(profile.app_notifications_enabled)
        self.assertFalse(profile.route_alerts_enabled)
        self.assertEqual(profile.preferred_navigation_app, "waze")
        self.assertEqual(profile.app_language, "en")
        self.courier.refresh_from_db()
        self.assertEqual(self.courier.phone, "0733333333")
        self.assertTrue(CourierAvailabilitySession.objects.filter(courier=self.courier, ended_at__isnull=True).exists())

        response = self.client.patch("/api/courier/location/", {"is_available": False}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(CourierAvailabilitySession.objects.filter(courier=self.courier, ended_at__isnull=True).exists())

    def test_courier_accept_assigns_order_without_advancing_delivery_status_flow(self):
        response = self.client.patch(f"/api/courier/orders/{self.order.id}/accept/")

        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        delivery = Delivery.objects.get(order=self.order)
        self.assertEqual(self.order.courier_id, self.courier.id)
        self.assertEqual(self.order.order_status, OrderStatus.READY_FOR_PICKUP)
        self.assertEqual(delivery.status, DeliveryStatus.ASSIGNED)
        self.assertIsNone(delivery.pickup_time)

    def test_courier_operations_summary_uses_backend_delivery_data(self):
        now = timezone.now()
        older_delivered_at = now - timedelta(days=1)
        current_timezone = timezone.get_current_timezone()
        today = timezone.localdate()
        week_start = today - timedelta(days=today.weekday())
        older_delivered_date = timezone.localtime(older_delivered_at, current_timezone).date()
        expected_weekly_earnings = "15.00" if older_delivered_date >= week_start else "10.00"
        expected_monthly_earnings = (
            "15.00"
            if older_delivered_date.year == today.year and older_delivered_date.month == today.month
            else "10.00"
        )
        self.order.courier = self.courier
        self.order.order_status = OrderStatus.DELIVERED
        self.order.save(update_fields=("courier", "order_status", "updated_at"))
        Delivery.objects.create(
            order=self.order,
            courier=self.courier,
            status=DeliveryStatus.DELIVERED,
            pickup_time=now - timedelta(minutes=24),
            delivered_time=now,
            distance_km="3.40",
        )
        older_order = Order.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            address=self.address,
            courier=self.courier,
            subtotal="20.00",
            delivery_fee="5.00",
            total="25.00",
            fulfillment_type=FulfillmentType.DELIVERY,
            order_status=OrderStatus.DELIVERED,
        )
        Delivery.objects.create(
            order=older_order,
            courier=self.courier,
            status=DeliveryStatus.DELIVERED,
            pickup_time=older_delivered_at - timedelta(minutes=18),
            delivered_time=older_delivered_at,
            distance_km="2.10",
        )
        session_start = now - timedelta(minutes=90)
        session_end = now - timedelta(minutes=30)
        CourierAvailabilitySession.objects.create(
            courier=self.courier,
            started_at=session_start,
            ended_at=session_end,
        )
        today_start = timezone.make_aware(datetime.combine(timezone.localdate(), time.min), current_timezone)
        online_start = max(session_start, today_start)
        expected_online_minutes = round(max(0, (session_end - online_start).total_seconds()) / 60)

        response = self.client.get("/api/courier/operations/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["completed_today"], 1)
        self.assertEqual(payload["distance_today_km"], 3.4)
        self.assertEqual(payload["distance_total_km"], 5.5)
        self.assertEqual(payload["average_eta_minutes"], 24)
        self.assertEqual(payload["earnings_today"], "10.00")
        self.assertEqual(payload["available_balance"], "15.00")
        self.assertEqual(payload["earnings_this_week"], expected_weekly_earnings)
        self.assertEqual(payload["earnings_this_month"], expected_monthly_earnings)
        self.assertEqual(payload["online_minutes_today"], expected_online_minutes)

    def test_courier_operations_post_records_simulated_delivery_once(self):
        payload = {
            "reference_id": "simulated-offer-123",
            "delivery_fee": "24.00",
            "distance_km": "4.50",
            "duration_minutes": 18,
        }

        first_response = self.client.post("/api/courier/operations/", payload, format="json")
        second_response = self.client.post("/api/courier/operations/", payload, format="json")
        summary_response = self.client.get("/api/courier/operations/")

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 201)
        self.assertEqual(CourierOperationEntry.objects.filter(courier=self.courier).count(), 1)
        summary = summary_response.json()
        self.assertEqual(summary["completed_today"], 1)
        self.assertEqual(summary["completed_total"], 1)
        self.assertEqual(summary["distance_today_km"], 4.5)
        self.assertEqual(summary["distance_total_km"], 4.5)
        self.assertEqual(summary["average_eta_minutes"], 18)
        self.assertEqual(summary["earnings_today"], "24.00")
        self.assertEqual(summary["available_balance"], "24.00")

    def test_courier_operations_summary_includes_recent_backend_deliveries(self):
        now = timezone.now()
        self.order.courier = self.courier
        self.order.order_status = OrderStatus.DELIVERED
        self.order.save(update_fields=("courier", "order_status", "updated_at"))
        Delivery.objects.create(
            order=self.order,
            courier=self.courier,
            status=DeliveryStatus.DELIVERED,
            pickup_time=now - timedelta(minutes=21),
            delivered_time=now,
            distance_km="3.20",
        )
        CourierOperationEntry.objects.create(
            courier=self.courier,
            reference_id="simulated-offer-history",
            completed_at=now,
            delivery_fee="19.00",
            distance_km="4.70",
            duration_minutes=16,
            metadata={
                "restaurant_name": "Sim Bistro",
                "customer_name": "Client Backend",
                "dropoff_address": "Strada Simularii 9",
            },
        )

        response = self.client.get("/api/courier/operations/")

        self.assertEqual(response.status_code, 200)
        recent_deliveries = response.json()["recent_deliveries"]
        delivery_sources = {delivery["source"] for delivery in recent_deliveries}
        self.assertEqual(delivery_sources, {"order", "simulation"})
        order_delivery = next(delivery for delivery in recent_deliveries if delivery["source"] == "order")
        simulation_delivery = next(delivery for delivery in recent_deliveries if delivery["source"] == "simulation")
        self.assertEqual(order_delivery["order_id"], self.order.id)
        self.assertEqual(order_delivery["duration_minutes"], 21)
        self.assertEqual(order_delivery["distance_km"], 3.2)
        self.assertEqual(simulation_delivery["reference_id"], "simulated-offer-history")
        self.assertEqual(simulation_delivery["delivery_fee"], "19.00")
        self.assertEqual(simulation_delivery["restaurant_name"], "Sim Bistro")
        self.assertEqual(simulation_delivery["customer_name"], "Client Backend")
        self.assertEqual(simulation_delivery["dropoff_address"], "Strada Simularii 9")
        self.assertIsNone(simulation_delivery["order"])

    def test_courier_documents_list_missing_and_post_pending_document(self):
        list_response = self.client.get("/api/courier/documents/")

        self.assertEqual(list_response.status_code, 200)
        documents = list_response.json()["results"]
        self.assertEqual(len(documents), 4)
        self.assertEqual({document["status"] for document in documents}, {"missing"})

        post_response = self.client.post(
            "/api/courier/documents/",
            {"document_type": "driving_license", "file_name": "permis.pdf"},
            format="json",
        )
        list_response = self.client.get("/api/courier/documents/")

        self.assertEqual(post_response.status_code, 201)
        self.assertEqual(post_response.json()["status"], "pending")
        self.assertTrue(CourierDocument.objects.filter(courier=self.courier, document_type="driving_license").exists())
        driving_license = next(document for document in list_response.json()["results"] if document["document_type"] == "driving_license")
        self.assertEqual(driving_license["status"], "pending")
        self.assertEqual(driving_license["file_name"], "permis.pdf")

    def test_courier_help_and_support_ticket_endpoints(self):
        help_response = self.client.get("/api/courier/help/")
        ticket_response = self.client.post(
            "/api/courier/support/",
            {
                "subject": "Problemă cursă simulată",
                "message": "Cursa nu apare în sold.",
            },
            format="json",
        )
        list_response = self.client.get("/api/courier/support/")

        self.assertEqual(help_response.status_code, 200)
        self.assertGreaterEqual(len(help_response.json()["articles"]), 1)
        self.assertEqual(ticket_response.status_code, 201)
        self.assertEqual(ticket_response.json()["status"], "open")
        self.assertEqual(CourierSupportTicket.objects.filter(courier=self.courier).count(), 1)
        self.assertEqual(len(list_response.json()["results"]), 1)
