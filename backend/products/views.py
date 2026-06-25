from django.conf import settings
from django.db.models import Count, Exists, OuterRef
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.views import APIView

from core.permissions import IsRestaurantOwner
from products.filters import ProductFilter
from products.models import Product, ProductComment, ProductCommentLike, ProductLike
from products.serializers import (
    ProductCommentCreateSerializer,
    ProductCommentLikeSummarySerializer,
    ProductCommentSerializer,
    ProductSerializer,
    ProductSocialSummarySerializer,
    RestaurantOwnerProductSerializer,
)
from restaurants.ownership import get_primary_restaurant_id_for_owner


def with_product_social_counts(queryset, request):
    queryset = queryset.annotate(
        likes_count=Count("likes", distinct=True),
        comments_count=Count("comments", distinct=True),
    )
    if request.user and request.user.is_authenticated:
        queryset = queryset.annotate(
            is_liked=Exists(
                ProductLike.objects.filter(product=OuterRef("pk"), user=request.user)
            )
        )
    return queryset


def with_comment_social_counts(queryset, request):
    queryset = queryset.annotate(likes_count=Count("likes", distinct=True))
    if request.user and request.user.is_authenticated:
        queryset = queryset.annotate(
            is_liked=Exists(
                ProductCommentLike.objects.filter(comment=OuterRef("pk"), user=request.user)
            )
        )
    return queryset


def absolute_media_url(request, value):
    if not value:
        return ""
    try:
        url = value.url
    except ValueError:
        url = str(value)
    return request.build_absolute_uri(url)


class AppleAppSiteAssociationView(APIView):
    authentication_classes = ()
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        return JsonResponse(
            {
                "applinks": {
                    "apps": [],
                    "details": [
                        {
                            "appIDs": settings.APPLE_ASSOCIATED_APP_IDS,
                            "components": [
                                {
                                    "/": "/p/*",
                                    "comment": "Open short Yumzy product links in the iOS app.",
                                },
                                {
                                    "/": "/links/products/*",
                                    "comment": "Open shared Yumzy product links in the iOS app.",
                                }
                            ],
                        }
                    ],
                }
            }
        )


class ProductSharePageView(APIView):
    authentication_classes = ()
    permission_classes = (permissions.AllowAny,)

    def get(self, request, product_id):
        product = get_object_or_404(
            Product.objects.select_related("restaurant"),
            pk=product_id,
            restaurant__is_active=True,
        )
        share_url = request.build_absolute_uri()
        open_in_app_url = f"onediningclub://products/{product.id}"
        image_url = absolute_media_url(request, product.image) or absolute_media_url(request, product.restaurant.cover_image)
        video_url = product.video_url or ""
        effective_price = product.effective_price
        site_url = settings.SITE_URL.rstrip("/")
        brand_og_image_url = f"{site_url}/assets/seo/og-yumzy.png"
        favicon_url = f"{site_url}/assets/seo/favicon.png"
        favicon_32_url = f"{site_url}/assets/seo/favicon-32.png"
        apple_touch_icon_url = f"{site_url}/assets/seo/apple-touch-icon.png"

        return render(
            request,
            "products/share_product.html",
            {
                "product": product,
                "restaurant": product.restaurant,
                "share_url": share_url,
                "open_in_app_url": open_in_app_url,
                "image_url": image_url,
                "video_url": video_url,
                "og_image_url": image_url or brand_og_image_url,
                "brand_og_image_url": brand_og_image_url,
                "favicon_url": favicon_url,
                "favicon_32_url": favicon_32_url,
                "apple_touch_icon_url": apple_touch_icon_url,
                "landing_background_video_url": f"{site_url}/assets/login-hero.mp4",
                "price_display": f"{effective_price:.2f} RON",
                "ios_app_store_url": settings.IOS_APP_STORE_URL,
            },
        )


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = (permissions.AllowAny,)
    filterset_class = ProductFilter
    search_fields = ("name", "description", "restaurant__name", "allergens")
    ordering_fields = ("name", "price", "created_at", "preparation_time")
    ordering = ("category__sort_order", "name")

    def get_queryset(self):
        queryset = (
            Product.objects.select_related("restaurant", "category")
            .prefetch_related("option_groups__options")
            .filter(restaurant__is_active=True)
        )
        return with_product_social_counts(queryset, self.request)

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        product = self.get_object()
        like, created = ProductLike.objects.get_or_create(product=product, user=request.user)
        if not created:
            like.delete()

        product = Product.objects.get(pk=product.pk)
        serializer = ProductSocialSummarySerializer(product, context={"request": request})
        return response.Response(serializer.data)

    @decorators.action(
        detail=True,
        methods=["get", "post"],
        permission_classes=[permissions.IsAuthenticatedOrReadOnly],
    )
    def comments(self, request, pk=None):
        product = self.get_object()

        if request.method == "POST":
            serializer = ProductCommentCreateSerializer(
                data=request.data,
                context={"request": request, "product": product},
            )
            serializer.is_valid(raise_exception=True)
            comment = serializer.save(product=product, user=request.user)
            return response.Response(
                ProductCommentSerializer(comment, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

        comments = with_comment_social_counts(
            ProductComment.objects.select_related("user")
            .filter(product=product, parent__isnull=True)
            .order_by("-created_at"),
            request,
        )
        page = self.paginate_queryset(comments)
        if page is not None:
            serializer = ProductCommentSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = ProductCommentSerializer(comments, many=True, context={"request": request})
        return response.Response(serializer.data)


class RestaurantOwnerProductViewSet(viewsets.ModelViewSet):
    serializer_class = RestaurantOwnerProductSerializer
    permission_classes = (IsRestaurantOwner,)
    http_method_names = ("get", "post", "patch", "delete", "head", "options")
    filterset_fields = ("restaurant", "category", "is_available", "is_popular")
    search_fields = ("name", "description")
    ordering_fields = ("name", "price", "created_at", "updated_at")

    def get_queryset(self):
        primary_restaurant_id = get_primary_restaurant_id_for_owner(self.request.user)
        queryset = Product.objects.select_related("restaurant", "category").filter(
            restaurant__owner=self.request.user,
            restaurant_id=primary_restaurant_id,
        ).order_by("category__sort_order", "id")
        return with_product_social_counts(queryset, self.request)


class ProductCommentViewSet(viewsets.GenericViewSet):
    serializer_class = ProductCommentSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    http_method_names = ("get", "post", "head", "options")

    def get_queryset(self):
        queryset = ProductComment.objects.select_related("user", "product", "product__restaurant")
        return with_comment_social_counts(queryset, self.request)

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        comment = self.get_object()
        like, created = ProductCommentLike.objects.get_or_create(comment=comment, user=request.user)
        if not created:
            like.delete()

        comment = ProductComment.objects.get(pk=comment.pk)
        serializer = ProductCommentLikeSummarySerializer(comment, context={"request": request})
        return response.Response(serializer.data)
