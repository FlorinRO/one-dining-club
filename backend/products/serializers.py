from pathlib import Path
import json

from django.core.files.storage import default_storage
from django.utils.text import get_valid_filename
from rest_framework import serializers

from menus.models import ProductCategory
from products.models import Product, ProductComment, ProductCommentLike, ProductOption, ProductOptionGroup
from restaurants.models import Restaurant
from restaurants.ownership import get_primary_restaurant_for_owner, get_primary_restaurant_id_for_owner


def display_name_for_user(user):
    if not user:
        return "user"
    if user.full_name:
        return user.full_name
    return user.email.split("@", 1)[0] if user.email else "user"


def store_product_video(video_file):
    safe_name = get_valid_filename(Path(video_file.name).name or "product-video")
    stored_path = default_storage.save(f"products/videos/{safe_name}", video_file)
    return default_storage.url(stored_path)


def normalize_ingredient_details(value):
    if value in (None, "", []):
        return []
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return []
        value = json.loads(value)
    if not isinstance(value, list):
        raise serializers.ValidationError("Ingredient details must be a list.")

    normalized = []
    for item in value:
        if not isinstance(item, dict):
            raise serializers.ValidationError("Each ingredient must be an object.")
        name = str(item.get("name", "")).strip()
        grams = item.get("grams")
        calories = item.get("calories")
        price_per_20g = next(
            (
                item.get(key)
                for key in ("price_per_20g", "pricePer20g", "extra_price_per_20g", "extraPricePer20g")
                if item.get(key) not in (None, "")
            ),
            None,
        )
        can_add_extra = next(
            (
                item.get(key)
                for key in ("can_add_extra", "canAddExtra", "extra_available", "can_order_extra")
                if key in item
            ),
            True,
        )
        if not name:
            continue
        normalized.append(
            {
                "name": name,
                "grams": int(grams) if grams not in (None, "",) else None,
                "calories": int(calories) if calories not in (None, "",) else None,
                "price_per_20g": str(price_per_20g) if price_per_20g not in (None, "",) else None,
                "can_add_extra": False if can_add_extra in (False, "false", "False", "0", 0) else True,
            }
        )
    return normalized


def normalize_ingredient_details_for_output(value):
    try:
        return normalize_ingredient_details(value)
    except serializers.ValidationError:
        return []


def summarize_ingredient_details(items):
    summary = []
    for item in items:
        details = []
        if item.get("grams") is not None:
            details.append(f"{item['grams']}g")
        if item.get("calories") is not None:
            details.append(f"{item['calories']} kcal")
        summary.append(" ".join([item["name"], *details]).strip())
    return ", ".join(part for part in summary if part)


class ProductOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductOption
        fields = ("id", "name", "extra_price", "is_available")


class ProductOptionGroupSerializer(serializers.ModelSerializer):
    options = ProductOptionSerializer(many=True, read_only=True)

    class Meta:
        model = ProductOptionGroup
        fields = ("id", "name", "is_required", "min_select", "max_select", "options")


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    product_type_label = serializers.CharField(source="get_product_type_display", read_only=True)
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True)
    effective_price = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    option_groups = ProductOptionGroupSerializer(many=True, read_only=True)
    ingredient_details = serializers.JSONField(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "restaurant",
            "restaurant_name",
            "category",
            "category_name",
            "product_type",
            "product_type_label",
            "name",
            "description",
            "image",
            "audio_url",
            "has_audio",
            "video_url",
            "price",
            "discount_price",
            "effective_price",
            "is_available",
            "is_popular",
            "preparation_time",
            "allergens",
            "ingredients",
            "ingredient_details",
            "calories",
            "option_groups",
            "likes_count",
            "comments_count",
            "is_liked",
            "created_at",
            "updated_at",
        )

    def get_likes_count(self, obj):
        annotated_count = getattr(obj, "likes_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.likes.count()

    def get_comments_count(self, obj):
        annotated_count = getattr(obj, "comments_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.comments.count()

    def get_is_liked(self, obj):
        annotated_value = getattr(obj, "is_liked", None)
        if annotated_value is not None:
            return bool(annotated_value)

        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["ingredient_details"] = normalize_ingredient_details_for_output(instance.ingredient_details)
        return data


class RestaurantOwnerProductSerializer(serializers.ModelSerializer):
    restaurant_id = serializers.PrimaryKeyRelatedField(
        queryset=Restaurant.objects.none(),
        source="restaurant",
        write_only=True,
        required=False,
    )
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductCategory.objects.none(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    product_type_label = serializers.CharField(source="get_product_type_display", read_only=True)
    video_file = serializers.FileField(write_only=True, required=False, allow_empty_file=False)
    ingredient_details = serializers.JSONField(required=False)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "restaurant",
            "restaurant_id",
            "restaurant_name",
            "category",
            "category_id",
            "category_name",
            "product_type",
            "product_type_label",
            "name",
            "description",
            "image",
            "audio_url",
            "has_audio",
            "video_url",
            "video_file",
            "price",
            "discount_price",
            "is_available",
            "is_popular",
            "preparation_time",
            "allergens",
            "ingredients",
            "ingredient_details",
            "calories",
            "likes_count",
            "comments_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "restaurant",
            "category",
            "product_type_label",
            "likes_count",
            "comments_count",
            "created_at",
            "updated_at",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return
        primary_restaurant_id = get_primary_restaurant_id_for_owner(request.user)
        self.fields["restaurant_id"].queryset = Restaurant.objects.filter(owner=request.user, id=primary_restaurant_id)
        self.fields["category_id"].queryset = ProductCategory.objects.filter(restaurant_id=primary_restaurant_id)

    def validate(self, attrs):
        video_file = attrs.get("video_file")
        if video_file:
            content_type = getattr(video_file, "content_type", "") or ""
            extension = Path(video_file.name).suffix.lower()
            allowed_extensions = {".mp4", ".mov", ".m4v", ".webm"}
            if content_type and not content_type.startswith("video/"):
                raise serializers.ValidationError({"video_file": "Upload a valid video file."})
            if extension not in allowed_extensions:
                raise serializers.ValidationError({"video_file": "Supported video formats: MP4, MOV, M4V, WEBM."})
        elif self.instance is None and not attrs.get("video_url"):
            raise serializers.ValidationError(
                {"video_file": "Adaugă un fișier video sau un Video URL pentru produse noi."}
            )

        restaurant = attrs.get("restaurant") or getattr(self.instance, "restaurant", None)
        category = attrs.get("category")

        if restaurant is None:
            restaurant = get_primary_restaurant_for_owner(self.context["request"].user)
            if not restaurant:
                raise serializers.ValidationError({"restaurant_id": "Restaurant is required."})
            attrs["restaurant"] = restaurant

        if category and category.restaurant_id != attrs.get("restaurant", restaurant).id:
            raise serializers.ValidationError({"category_id": "Category must belong to the selected restaurant."})

        if "ingredient_details" in attrs:
            ingredient_details = normalize_ingredient_details(attrs.get("ingredient_details"))
            attrs["ingredient_details"] = ingredient_details
            attrs["ingredients"] = summarize_ingredient_details(ingredient_details)
        return attrs

    def create(self, validated_data):
        video_file = validated_data.pop("video_file", None)
        if video_file:
            validated_data["video_url"] = store_product_video(video_file)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        video_file = validated_data.pop("video_file", None)
        if video_file:
            validated_data["video_url"] = store_product_video(video_file)
        return super().update(instance, validated_data)

    def get_likes_count(self, obj):
        annotated_count = getattr(obj, "likes_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.likes.count()

    def get_comments_count(self, obj):
        annotated_count = getattr(obj, "comments_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.comments.count()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["ingredient_details"] = normalize_ingredient_details_for_output(instance.ingredient_details)
        return data


class ProductSocialSummarySerializer(serializers.ModelSerializer):
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ("id", "likes_count", "comments_count", "is_liked")

    def get_likes_count(self, obj):
        return getattr(obj, "likes_count", None) if getattr(obj, "likes_count", None) is not None else obj.likes.count()

    def get_comments_count(self, obj):
        return (
            getattr(obj, "comments_count", None)
            if getattr(obj, "comments_count", None) is not None
            else obj.comments.count()
        )

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()


class ProductCommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = ProductComment
        fields = (
            "id",
            "product",
            "parent",
            "author",
            "text",
            "photo_urls",
            "likes_count",
            "is_liked",
            "replies",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_author(self, obj):
        return display_name_for_user(obj.user)

    def get_likes_count(self, obj):
        annotated_count = getattr(obj, "likes_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.likes.count()

    def get_is_liked(self, obj):
        annotated_value = getattr(obj, "is_liked", None)
        if annotated_value is not None:
            return bool(annotated_value)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()

    def get_replies(self, obj):
        if not self.context.get("include_replies", True):
            return []
        replies = obj.replies.select_related("user").all().order_by("created_at")
        serializer = ProductCommentSerializer(
            replies,
            many=True,
            context={**self.context, "include_replies": False},
        )
        return serializer.data


class ProductCommentCreateSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(
        queryset=ProductComment.objects.all(),
        required=False,
        allow_null=True,
    )
    photo_urls = serializers.ListField(
        child=serializers.CharField(max_length=1000),
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = ProductComment
        fields = ("parent", "text", "photo_urls")

    def validate(self, attrs):
        product = self.context["product"]
        parent = attrs.get("parent")
        text = attrs.get("text", "")
        photo_urls = attrs.get("photo_urls", [])

        if parent and parent.product_id != product.id:
            raise serializers.ValidationError({"parent": "Reply parent must belong to this product."})
        if parent and parent.parent_id:
            raise serializers.ValidationError({"parent": "Nested replies are not supported."})
        if not text.strip() and not photo_urls:
            raise serializers.ValidationError({"text": "Comment text or at least one photo is required."})
        return attrs


class ProductCommentLikeSummarySerializer(serializers.ModelSerializer):
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = ProductComment
        fields = ("id", "likes_count", "is_liked")

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return ProductCommentLike.objects.filter(comment=obj, user=request.user).exists()
