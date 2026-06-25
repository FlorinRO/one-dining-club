from django.db.models import Count, Exists, OuterRef
from rest_framework import decorators, permissions, response, status, viewsets

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
