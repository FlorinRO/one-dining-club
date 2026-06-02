from django.contrib.auth.tokens import default_token_generator
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

from addresses.models import Address
from orders.models import Order, PaymentMethod
from restaurants.models import Restaurant
from users.models import User, UserRole


class EmailVerificationConfirmFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="newuser@example.com",
            password="StrongPass123!",
            role=UserRole.CUSTOMER,
            is_active=False,
        )
        self.uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = default_token_generator.make_token(self.user)

    def test_public_confirm_page_activates_user_and_renders_html(self):
        response = self.client.get("/verify-email/confirm/", {"uid": self.uid, "token": self.token})

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Email confirmat")
        self.assertContains(response, "Deschide aplicația")

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_public_confirm_page_handles_invalid_token(self):
        response = self.client.get("/verify-email/confirm/", {"uid": self.uid, "token": "invalid-token"})

        self.assertEqual(response.status_code, 400)
        self.assertContains(response, "Link invalid sau expirat", status_code=400)

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_api_confirm_get_redirects_to_public_page(self):
        response = self.client.get("/api/auth/verify-email/confirm/", {"uid": self.uid, "token": self.token})

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], f"/verify-email/confirm/?uid={self.uid}&token={self.token}")

    def test_api_confirm_post_returns_json_and_activates_user(self):
        response = self.client.post(
            "/api/auth/verify-email/confirm/",
            {"uid": self.uid, "token": self.token},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["detail"], "Email confirmat. Te poti autentifica in aplicatie.")

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)


class DeleteAccountFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_delete_me_hard_deletes_user_without_protected_relations(self):
        user = User.objects.create_user(email="delete-me@example.com", password="StrongPass123!", role=UserRole.CUSTOMER)
        self.client.force_authenticate(user=user)

        response = self.client.delete("/api/auth/me/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(User.objects.filter(pk=user.pk).exists())

    def test_delete_me_anonymizes_user_with_orders(self):
        user = User.objects.create_user(
            email="history@example.com",
            password="StrongPass123!",
            role=UserRole.CUSTOMER,
            first_name="Florin",
            last_name="Iftim",
            phone="0712345678",
        )
        owner = User.objects.create_user(email="owner@example.com", password="StrongPass123!", role=UserRole.RESTAURANT_OWNER)
        address = Address.objects.create(
            user=user,
            label="Home",
            full_name="Florin Iftim",
            phone="0712345678",
            address_line_1="Strada Test 1",
            city="Bucuresti",
        )
        restaurant = Restaurant.objects.create(
            owner=owner,
            name="Yumzy Test Kitchen",
            address="Strada Restaurant 10",
            city="Bucuresti",
        )
        Order.objects.create(
            customer=user,
            restaurant=restaurant,
            address=address,
            subtotal="10.00",
            delivery_fee="5.00",
            total="15.00",
            payment_method=PaymentMethod.CASH,
        )
        self.client.force_authenticate(user=user)

        response = self.client.delete("/api/auth/me/")

        self.assertEqual(response.status_code, 204)
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertEqual(user.first_name, "")
        self.assertEqual(user.last_name, "")
        self.assertEqual(user.phone, "")
        self.assertEqual(user.email, f"deleted-user-{user.pk}@deleted.yumzy.local")
        self.assertFalse(user.has_usable_password())
        address.refresh_from_db()
        self.assertEqual(address.label, "Deleted")
        self.assertEqual(address.full_name, "")
        self.assertEqual(address.phone, "")
        self.assertEqual(address.address_line_1, "")
        self.assertEqual(address.city, "")
