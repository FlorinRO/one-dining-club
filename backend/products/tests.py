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
            product_type="burger",
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
        self.assertEqual(items[0]["product_type"], "burger")
        self.assertEqual(items[0]["product_type_label"], "Burgeri")

    def test_products_can_be_filtered_by_product_type(self):
        Product.objects.create(
            restaurant=self.restaurant,
            name="Pizza Margherita",
            product_type="pizza",
            price="35.00",
            is_available=True,
        )

        response = self.client.get("/api/products/", {"product_type": "pizza"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        items = payload["results"] if isinstance(payload, dict) else payload
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["product_type"], "pizza")

    def test_new_product_types_expose_expected_labels(self):
        seafood = Product.objects.create(
            restaurant=self.restaurant,
            name="Creveți în unt",
            product_type="seafood",
            price="58.00",
            is_available=True,
        )
        fish = Product.objects.create(
            restaurant=self.restaurant,
            name="Somon la grătar",
            product_type="fish",
            price="64.00",
            is_available=True,
        )
        shawarma = Product.objects.create(
            restaurant=self.restaurant,
            name="Shaorma de pui",
            product_type="shawarma",
            price="32.00",
            is_available=True,
        )

        response = self.client.get("/api/products/", {"restaurant": self.restaurant.id})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        items = payload["results"] if isinstance(payload, dict) else payload
        labels_by_id = {item["id"]: item["product_type_label"] for item in items}
        self.assertEqual(labels_by_id[seafood.id], "Fructe de mare")
        self.assertEqual(labels_by_id[fish.id], "Pește")
        self.assertEqual(labels_by_id[shawarma.id], "Shaorma")

    def test_products_expose_structured_ingredient_details(self):
        self.product.ingredients = "Mozzarella 120g 280 kcal, Busuioc 10g 3 kcal"
        self.product.ingredient_details = [
            {"name": "Mozzarella", "grams": 120, "calories": 280, "price_per_20g": "4.50"},
            {"name": "Busuioc", "grams": 10, "calories": 3, "price_per_20g": None},
        ]
        self.product.save(update_fields=["ingredients", "ingredient_details"])

        response = self.client.get(f"/api/products/{self.product.id}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["ingredient_details"][0]["name"], "Mozzarella")
        self.assertEqual(payload["ingredient_details"][0]["grams"], 120)
        self.assertEqual(payload["ingredient_details"][0]["price_per_20g"], "4.50")

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

    def test_owner_can_save_structured_ingredient_details_via_multipart(self):
        self.client.force_authenticate(user=self.owner)
        video_file = SimpleUploadedFile(
            "ingredient-video.mp4",
            b"fake-video-content",
            content_type="video/mp4",
        )

        with patch(
            "products.serializers.store_product_video",
            return_value="https://media.example/products/videos/ingredient-video.mp4",
        ):
            response = self.client.post(
                "/api/restaurant-owner/products/",
                {
                    "name": "Ingredient Burger",
                    "description": "Produs cu ingrediente structurate.",
                    "product_type": "burger",
                    "price": "49.00",
                    "video_file": video_file,
                    "ingredient_details": '[{"name":"Cheddar","grams":40,"calories":120,"price_per_20g":"3.50","can_add_extra":true},{"name":"Ceapă caramelizată","grams":20,"calories":35,"price_per_20g":"1.50","can_add_extra":false}]',
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["ingredient_details"][0]["name"], "Cheddar")
        self.assertEqual(payload["ingredient_details"][0]["price_per_20g"], "3.50")
        self.assertTrue(payload["ingredient_details"][0]["can_add_extra"])
        self.assertFalse(payload["ingredient_details"][1]["can_add_extra"])

    def test_owner_can_update_structured_ingredient_details_via_multipart(self):
        self.client.force_authenticate(user=self.owner)
        self.product.video_url = "https://media.example/products/videos/existing.mp4"
        self.product.save(update_fields=["video_url"])

        response = self.client.patch(
            f"/api/restaurant-owner/products/{self.product.id}/",
            {
                "ingredient_details": '[{"name":"Mozzarella","grams":60,"calories":150,"price_per_20g":"5.00","can_add_extra":true},{"name":"Busuioc","grams":8,"calories":2,"price_per_20g":"0.00","can_add_extra":false}]',
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["ingredient_details"][0]["price_per_20g"], "5.00")
        self.assertTrue(payload["ingredient_details"][0]["can_add_extra"])
        self.assertFalse(payload["ingredient_details"][1]["can_add_extra"])
        self.product.refresh_from_db()
        self.assertEqual(self.product.ingredient_details[0]["price_per_20g"], "5.00")

    def test_owner_product_list_normalizes_stringified_ingredient_details(self):
        self.client.force_authenticate(user=self.owner)
        self.product.video_url = "https://media.example/products/videos/existing.mp4"
        self.product.ingredient_details = (
            '[{"name":"Mozzarella","grams":60,"calories":150,"pricePer20g":"5.00","canAddExtra":false}]'
        )
        self.product.save(update_fields=["video_url", "ingredient_details"])

        response = self.client.get("/api/restaurant-owner/products/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        items = payload["results"] if isinstance(payload, dict) else payload
        self.assertEqual(items[0]["ingredient_details"][0]["price_per_20g"], "5.00")
        self.assertFalse(items[0]["ingredient_details"][0]["can_add_extra"])

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

    @override_settings(
        APPLE_ASSOCIATED_APP_IDS=["ABCD123456.club.onedining.customer"],
        IOS_APP_STORE_URL="https://apps.apple.com/app/id123456789",
    )
    def test_product_share_page_renders_public_fallback(self):
        response = self.client.get(f"/p/{self.product.id}/")

        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        self.assertIn(self.product.name, content)
        self.assertIn("onediningclub://products/", content)
        self.assertIn("https://apps.apple.com/app/id123456789", content)
        self.assertIn("/assets/seo/favicon.png", content)
        self.assertIn("/assets/seo/og-yumzy.png", content)

    @override_settings(
        APPLE_ASSOCIATED_APP_IDS=["ABCD123456.club.onedining.customer"],
        IOS_APP_STORE_URL="https://apps.apple.com/app/id123456789",
    )
    def test_product_share_page_renders_video_when_available(self):
        self.product.video_url = "https://cdn.yumzy.ro/videos/focaccia.mp4"
        self.product.save(update_fields=["video_url"])

        response = self.client.get(f"/p/{self.product.id}/")

        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        self.assertIn("<video", content)
        self.assertIn("https://cdn.yumzy.ro/videos/focaccia.mp4", content)

    @override_settings(APPLE_ASSOCIATED_APP_IDS=["ABCD123456.club.onedining.customer"])
    def test_apple_app_site_association_lists_product_path(self):
        response = self.client.get("/.well-known/apple-app-site-association")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/json")
        payload = response.json()
        self.assertEqual(payload["applinks"]["details"][0]["appIDs"], ["ABCD123456.club.onedining.customer"])
        self.assertEqual(payload["applinks"]["details"][0]["components"][0]["/"], "/p/*")
        self.assertEqual(payload["applinks"]["details"][0]["components"][1]["/"], "/links/products/*")
