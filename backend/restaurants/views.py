from django.db.models import Count, Exists, OuterRef
from django.conf import settings
from rest_framework import decorators, generics, permissions, response, status, viewsets

from core.permissions import IsRestaurantOwner
from menus.serializers import ProductCategorySerializer
from products.models import Product
from products.serializers import ProductSerializer
from products.views import with_product_social_counts
from restaurants.filters import RestaurantFilter
from restaurants.models import Restaurant, RestaurantCategory
from restaurants.ownership import get_primary_restaurant_id_for_owner
from restaurants.serializers import (
    RestaurantApplicationCreateSerializer,
    RestaurantCategorySerializer,
    RestaurantDetailSerializer,
    RestaurantListSerializer,
    RestaurantOwnerOverviewSerializer,
    RestaurantOwnerSerializer,
)
from reviews.models import Review
from reviews.serializers import ReviewSerializer


class RestaurantCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RestaurantCategorySerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = None
    search_fields = ("name",)
    ordering_fields = ("name",)
    ordering = ("name",)

    def get_queryset(self):
        return RestaurantCategory.objects.filter(is_active=True)


class RestaurantViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = (permissions.AllowAny,)
    lookup_field = "id"
    filterset_class = RestaurantFilter
    search_fields = ("name", "description", "city", "categories__name")
    ordering_fields = (
        "rating",
        "delivery_fee",
        "minimum_order",
        "estimated_delivery_time_min",
        "reviews_count",
    )
    ordering = ("name",)

    def get_queryset(self):
        offer_products = Product.objects.filter(
            restaurant=OuterRef("pk"),
            is_available=True,
            discount_price__isnull=False,
        )
        listed_products = Product.objects.filter(
            restaurant=OuterRef("pk"),
            is_available=True,
        )
        return (
            Restaurant.objects.select_related("owner")
            .prefetch_related("categories", "opening_hours", "product_categories")
            .filter(is_active=True)
            .annotate(
                reviews_count=Count("reviews", distinct=True),
                has_offer=Exists(offer_products),
                has_products=Exists(listed_products),
            )
            .filter(has_products=True)
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return RestaurantDetailSerializer
        return RestaurantListSerializer

    @decorators.action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def products(self, request, id=None):
        restaurant = self.get_object()
        products = (
            restaurant.products.select_related("category", "restaurant")
            .prefetch_related("option_groups__options")
            .filter(is_available=True)
            .order_by("id")
        )
        products = with_product_social_counts(products, request)
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        serializer = ProductSerializer(products, many=True, context={"request": request})
        return response.Response(serializer.data)

    @decorators.action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def categories(self, request, id=None):
        restaurant = self.get_object()
        categories = restaurant.product_categories.filter(is_active=True)
        serializer = ProductCategorySerializer(categories, many=True, context={"request": request})
        return response.Response(serializer.data)

    @decorators.action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def reviews(self, request, id=None):
        restaurant = self.get_object()
        reviews = Review.objects.select_related("customer", "restaurant", "order").filter(restaurant=restaurant)
        page = self.paginate_queryset(reviews)
        if page is not None:
            serializer = ReviewSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        serializer = ReviewSerializer(reviews, many=True, context={"request": request})
        return response.Response(serializer.data)


class RestaurantOwnerRestaurantViewSet(viewsets.ModelViewSet):
    permission_classes = (IsRestaurantOwner,)
    serializer_class = RestaurantOwnerSerializer
    http_method_names = ("get", "post", "patch", "head", "options")
    search_fields = ("name", "city", "description")
    ordering_fields = ("name", "created_at", "updated_at")

    def get_queryset(self):
        primary_restaurant_id = get_primary_restaurant_id_for_owner(self.request.user)
        if not primary_restaurant_id:
            return Restaurant.objects.none()

        return (
            Restaurant.objects.select_related("owner")
            .prefetch_related("categories", "opening_hours", "product_categories")
            .filter(owner=self.request.user, id=primary_restaurant_id)
        )

    @decorators.action(detail=False, methods=["get"])
    def overview(self, request):
        queryset = RestaurantOwnerOverviewSerializer.with_metrics(self.get_queryset())
        serializer = RestaurantOwnerOverviewSerializer(queryset, many=True, context={"request": request})
        return response.Response(serializer.data)


class RestaurantApplicationCreateView(generics.CreateAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = RestaurantApplicationCreateSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["support_email"] = settings.SUPPORT_EMAIL
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        return response.Response(
            {
                "id": application.id,
                "detail": (
                    "Cererea a fost trimisă. Ți-am confirmat primirea pe email, iar după aprobare vei primi linkul de activare."
                ),
            },
            status=status.HTTP_201_CREATED,
        )
