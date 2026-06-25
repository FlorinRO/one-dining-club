import tempfile
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from products.models import Product, ProductComment, ProductCommentLike, ProductLike
from restaurants.models import Restaurant
from users.models import User, UserRole


class ProductSocialApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="owner-products@example.com",
            password="StrongPass123!",
            role=UserRole.RESTAURANT_OWNER,
        )
        self.customer = User.objects.create_user(
            email="customer-products@example.com",
            password="StrongPass123!",
            role=UserRole.CUSTOMER,
        )
        self.restaurant = Restaurant.objects.create(
            owner=self.owner,
            name="Social Kitchen",
            address="Strada Social 1",
            city="Bucuresti",
        )
        self.product = Product.objects.create(
            restaurant=self.restaurant,
            name="Social Burger",
            price="42.00",
            is_available=True,
        )

    def test_restaurant_products_include_real_social_counts(self):
        ProductLike.objects.create(product=self.product, user=self.customer)
        ProductComment.objects.create(product=self.product, user=self.customer, text="Foarte bun.")

        response = self.client.get(f"/api/restaurants/{self.restaurant.id}/products/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        items = payload["results"] if isinstance(payload, dict) else payload
        self.assertEqual(items[0]["id"], self.product.id)
        self.assertEqual(items[0]["likes_count"], 1)
        self.assertEqual(items[0]["comments_count"], 1)
        self.assertFalse(items[0]["is_liked"])

    def test_customer_can_toggle_product_like(self):
        self.client.force_authenticate(user=self.customer)

        first_response = self.client.post(f"/api/products/{self.product.id}/like/")
        second_response = self.client.post(f"/api/products/{self.product.id}/like/")

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(first_response.json()["likes_count"], 1)
        self.assertTrue(first_response.json()["is_liked"])
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(second_response.json()["likes_count"], 0)
        self.assertFalse(second_response.json()["is_liked"])

    def test_customer_can_create_comment_reply_and_like_comment(self):
        self.client.force_authenticate(user=self.customer)

        comment_response = self.client.post(
            f"/api/products/{self.product.id}/comments/",
            {"text": "Exact ca in video."},
            format="json",
        )
        reply_response = self.client.post(
            f"/api/products/{self.product.id}/comments/",
            {"parent": comment_response.json()["id"], "text": "Confirm."},
            format="json",
        )
        like_response = self.client.post(f"/api/product-comments/{comment_response.json()['id']}/like/")
        product_response = self.client.get(f"/api/products/{self.product.id}/")

        self.assertEqual(comment_response.status_code, 201)
        self.assertEqual(reply_response.status_code, 201)
        self.assertEqual(like_response.status_code, 200)
        self.assertEqual(like_response.json()["likes_count"], 1)
        self.assertEqual(product_response.json()["comments_count"], 2)
        self.assertEqual(ProductCommentLike.objects.count(), 1)

    def test_owner_can_create_product_with_video_file(self):
        self.client.force_authenticate(user=self.owner)
        video_file = SimpleUploadedFile(
            "menu-video.mp4",
            b"fake-video-content",
            content_type="video/mp4",
        )

        with patch(
            "products.serializers.store_product_video",
            return_value="https://media.example/products/videos/menu-video.mp4",
        ) as store_video:
            response = self.client.post(
                "/api/restaurant-owner/products/",
                {
                    "name": "Video Burger",
                    "description": "Produs cu video uploadat.",
                    "price": "49.00",
                    "video_file": video_file,
                    "is_available": "true",
                    "is_popular": "true",
                    "has_audio": "false",
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, 201)
        store_video.assert_called_once()
        payload = response.json()
        self.assertEqual(payload["video_url"], "https://media.example/products/videos/menu-video.mp4")
        product = Product.objects.get(id=payload["id"])
        self.assertEqual(product.restaurant, self.restaurant)
        self.assertEqual(product.video_url, "https://media.example/products/videos/menu-video.mp4")

    def test_owner_can_create_product_with_video_file_using_storage(self):
        self.client.force_authenticate(user=self.owner)
        video_file = SimpleUploadedFile(
            "storage-video.mp4",
            b"fake-video-content",
            content_type="video/mp4",
        )

        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(
                MEDIA_ROOT=media_root,
                MEDIA_URL="/test-media/",
                STORAGES={
                    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
                    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
                },
            ):
                response = self.client.post(
                    "/api/restaurant-owner/products/",
                    {
                        "name": "Storage Video Burger",
                        "description": "Produs cu video salvat în storage.",
                        "price": "51.00",
                        "video_file": video_file,
                        "is_available": "true",
                        "is_popular": "false",
                        "has_audio": "false",
                    },
                    format="multipart",
                )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["video_url"].startswith("/test-media/products/videos/storage-video"))
        product = Product.objects.get(id=payload["id"])
        self.assertEqual(product.video_url, payload["video_url"])

    def test_owner_cannot_create_product_without_video(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            "/api/restaurant-owner/products/",
            {
                "name": "No Video Burger",
                "description": "Produs fără video.",
                "price": "39.00",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Product.objects.filter(name="No Video Burger").exists())
