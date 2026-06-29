from django.contrib.auth.tokens import default_token_generator
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.dateparse import parse_datetime
from jwt import PyJWKClientError
from rest_framework.test import APIClient
from unittest.mock import patch

from addresses.models import Address
from orders.models import Order, PaymentMethod
from restaurants.models import Restaurant
from users.models import PushDevice, SocialAccount, User, UserRole


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


class PasswordResetFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="reset@example.com",
            password="StrongPass123!",
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        self.uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = default_token_generator.make_token(self.user)

    def test_public_reset_page_renders_form_for_valid_link(self):
        response = self.client.get("/reset-password/confirm/", {"uid": self.uid, "token": self.token})

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Setează parola nouă")
        self.assertContains(response, "Actualizează parola")

    def test_public_reset_page_handles_invalid_link(self):
        response = self.client.get("/reset-password/confirm/", {"uid": self.uid, "token": "invalid-token"})

        self.assertEqual(response.status_code, 400)
        self.assertContains(response, "Link invalid sau expirat", status_code=400)

    def test_public_reset_post_changes_password_and_renders_success(self):
        response = self.client.post(
            "/reset-password/confirm/",
            {"uid": self.uid, "token": self.token, "new_password": "NewStrongPass123!"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Parolă resetată")

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPass123!"))

    def test_api_reset_get_redirects_to_public_page(self):
        response = self.client.get("/api/auth/password-reset/confirm/", {"uid": self.uid, "token": self.token})

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], f"/reset-password/confirm/?uid={self.uid}&token={self.token}")

    def test_api_reset_post_returns_json_and_changes_password(self):
        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"uid": self.uid, "token": self.token, "new_password": "NewStrongPass123!"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["detail"], "Parola a fost resetată.")

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPass123!"))


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


class MeViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_me_returns_last_login_for_authenticated_user(self):
        user = User.objects.create_user(
            email="owner-dashboard@example.com",
            password="StrongPass123!",
            role=UserRole.RESTAURANT_OWNER,
            first_name="Owner",
            last_name="Dashboard",
        )
        user.last_login = user.date_joined
        user.save(update_fields=("last_login",))
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["email"], "owner-dashboard@example.com")
        self.assertEqual(payload["role"], UserRole.RESTAURANT_OWNER)
        self.assertEqual(payload["full_name"], "Owner Dashboard")
        self.assertEqual(parse_datetime(payload["last_login"]), user.last_login)


class PushDeviceApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="push-user@example.com",
            password="StrongPass123!",
            role=UserRole.CUSTOMER,
        )
        self.client.force_authenticate(user=self.user)

    def test_register_push_device_creates_active_device(self):
        response = self.client.post(
            "/api/push/devices/",
            {
                "expo_push_token": "ExpoPushToken[test-token]",
                "platform": "ios",
                "device_id": "device-1",
                "app_version": "0.1.0",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        device = PushDevice.objects.get()
        self.assertEqual(device.user, self.user)
        self.assertEqual(device.platform, "ios")
        self.assertEqual(device.device_id, "device-1")
        self.assertTrue(device.is_active)

    def test_register_push_device_deactivates_previous_token_for_same_installation(self):
        PushDevice.objects.create(
            user=self.user,
            expo_push_token="ExpoPushToken[old-token]",
            platform="ios",
            device_id="device-1",
        )

        response = self.client.post(
            "/api/push/devices/",
            {
                "expo_push_token": "ExpoPushToken[new-token]",
                "platform": "ios",
                "device_id": "device-1",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertFalse(PushDevice.objects.get(expo_push_token="ExpoPushToken[old-token]").is_active)
        self.assertTrue(PushDevice.objects.get(expo_push_token="ExpoPushToken[new-token]").is_active)

    def test_unregister_push_device_marks_device_inactive(self):
        device = PushDevice.objects.create(
            user=self.user,
            expo_push_token="ExpoPushToken[to-remove]",
            platform="android",
            device_id="device-2",
        )

        response = self.client.delete(
            "/api/push/devices/",
            {"expo_push_token": "ExpoPushToken[to-remove]"},
            format="json",
        )

        self.assertEqual(response.status_code, 204)
        device.refresh_from_db()
        self.assertFalse(device.is_active)


class SocialLoginFlowTests(TestCase):
    @patch("users.serializers.send_welcome_email")
    @patch("users.serializers.SocialLoginSerializer._fetch_profile")
    def test_google_social_login_creates_active_user_and_social_account(self, mock_fetch_profile, mock_send_welcome_email):
        mock_fetch_profile.return_value = {
            "subject": "google-subject-1",
            "email": "social@example.com",
            "first_name": "Social",
            "last_name": "User",
        }

        response = self.client.post(
            "/api/auth/social/",
            {"provider": "google", "id_token": "token"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(email="social@example.com")
        self.assertTrue(user.is_active)
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.first_name, "Social")
        self.assertTrue(
            SocialAccount.objects.filter(user=user, provider="google", subject="google-subject-1").exists()
        )
        mock_send_welcome_email.assert_called_once_with(user)

    @patch("users.serializers.SocialLoginSerializer._fetch_profile")
    def test_apple_social_login_uses_existing_subject_mapping_without_email(self, mock_fetch_profile):
        user = User.objects.create_user(
            email="apple@example.com",
            password=None,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        SocialAccount.objects.create(user=user, provider="apple", subject="apple-user-123")
        mock_fetch_profile.return_value = {
            "subject": "apple-user-123",
            "email": None,
            "first_name": "",
            "last_name": "",
        }

        response = self.client.post(
            "/api/auth/social/",
            {"provider": "apple", "id_token": "token"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], "apple@example.com")

    @patch("users.serializers.SocialLoginSerializer._fetch_profile")
    def test_apple_social_login_rejects_first_login_without_email(self, mock_fetch_profile):
        mock_fetch_profile.return_value = {
            "subject": "apple-user-456",
            "email": None,
            "first_name": "",
            "last_name": "",
        }

        response = self.client.post(
            "/api/auth/social/",
            {"provider": "apple", "id_token": "token"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["non_field_errors"][0], "The social account did not return an email address.")

    @patch("users.serializers.PyJWKClient.get_signing_key_from_jwt")
    def test_apple_social_login_returns_400_when_jwk_lookup_fails(self, mock_get_signing_key):
        mock_get_signing_key.side_effect = PyJWKClientError("boom")

        response = self.client.post(
            "/api/auth/social/",
            {"provider": "apple", "id_token": "token"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["non_field_errors"][0], "Could not verify the social login token.")
