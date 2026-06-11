from django.test import TestCase
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
