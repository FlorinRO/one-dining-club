from collections import Counter, defaultdict
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from addresses.serializers import AddressSerializer
from addresses.models import Address
from orders.models import FulfillmentType, Order, OrderEvent, OrderItem, OrderItemOption, OrderStatus, PaymentMethod, PaymentStatus
from payments.models import Payment
from payments.services import payment_provider_for_method
from products.models import Product, ProductOption
from promotions.models import DiscountType, PromoCode
from restaurants.models import Restaurant
from reviews.serializers import ReviewSerializer


class OrderItemOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItemOption
        fields = ("id", "option_name", "extra_price")


class OrderItemSerializer(serializers.ModelSerializer):
    options = OrderItemOptionSerializer(many=True, read_only=True)
    product_image = serializers.ImageField(source="product.image", read_only=True)
    product_video_url = serializers.CharField(source="product.video_url", read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product",
            "product_name",
            "product_image",
            "product_video_url",
            "quantity",
            "unit_price",
            "total_price",
            "notes",
            "options",
        )


class OrderEventSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True)
    actor_name = serializers.SerializerMethodField()
    courier_email = serializers.EmailField(source="courier.email", read_only=True)
    courier_name = serializers.SerializerMethodField()

    def get_actor_name(self, obj):
        if not obj.actor:
            return ""
        return obj.actor.full_name or obj.actor.email

    def get_courier_name(self, obj):
        if not obj.courier:
            return ""
        return obj.courier.full_name or obj.courier.email

    class Meta:
        model = OrderEvent
        fields = (
            "id",
            "event_type",
            "source",
            "previous_status",
            "next_status",
            "actor_email",
            "actor_name",
            "courier_email",
            "courier_name",
            "created_at",
        )
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True)
    restaurant_address = serializers.CharField(source="restaurant.address", read_only=True)
    restaurant_latitude = serializers.DecimalField(source="restaurant.latitude", max_digits=9, decimal_places=6, read_only=True)
    restaurant_longitude = serializers.DecimalField(source="restaurant.longitude", max_digits=9, decimal_places=6, read_only=True)
    customer_email = serializers.EmailField(source="customer.email", read_only=True)
    courier_email = serializers.EmailField(source="courier.email", read_only=True)
    courier_name = serializers.SerializerMethodField()
    courier_phone = serializers.SerializerMethodField()
    courier_vehicle_type = serializers.SerializerMethodField()
    address_details = AddressSerializer(source="address", read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    fulfillment_type_label = serializers.CharField(source="get_fulfillment_type_display", read_only=True)
    payment_method_label = serializers.CharField(source="get_payment_method_display", read_only=True)
    payment_status_label = serializers.CharField(source="get_payment_status_display", read_only=True)
    order_status_label = serializers.CharField(source="get_order_status_display", read_only=True)
    address_summary = serializers.SerializerMethodField()
    estimated_delivery_window_minutes = serializers.SerializerMethodField()
    estimated_distance_km = serializers.SerializerMethodField()
    estimated_arrival_minutes = serializers.SerializerMethodField()
    delivery_status = serializers.SerializerMethodField()
    pickup_time = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    events = OrderEventSerializer(many=True, read_only=True)
    review = ReviewSerializer(read_only=True)
    dispatch_offer_expires_at = serializers.SerializerMethodField()
    dispatch_distance_km = serializers.SerializerMethodField()

    def get_customer_name(self, obj):
        return obj.address.full_name if obj.address and obj.address.full_name else obj.customer.full_name or ""

    def _dispatch_offer(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or obj.courier_id:
            return None
        from couriers.models import DispatchOfferStatus

        return obj.dispatch_offers.filter(courier=request.user, status=DispatchOfferStatus.OFFERED).first()

    def get_dispatch_offer_expires_at(self, obj):
        offer = self._dispatch_offer(obj)
        return offer.expires_at if offer else None

    def get_dispatch_distance_km(self, obj):
        offer = self._dispatch_offer(obj)
        return offer.distance_km if offer else None

    def get_customer_phone(self, obj):
        return obj.address.phone if obj.address and obj.address.phone else obj.customer.phone or ""

    def get_address_summary(self, obj):
        if not obj.address:
            return ""
        parts = [obj.address.address_line_1]
        if obj.address.address_line_2:
            parts.append(obj.address.address_line_2)
        parts.append(obj.address.city)
        if obj.address.postcode:
            parts.append(obj.address.postcode)
        return ", ".join(part for part in parts if part)

    def get_estimated_delivery_window_minutes(self, obj):
        return {
            "min": obj.restaurant.estimated_delivery_time_min,
            "max": obj.restaurant.estimated_delivery_time_max,
        }

    def get_estimated_distance_km(self, obj):
        if obj.fulfillment_type != FulfillmentType.DELIVERY or not obj.address:
            return None
        restaurant_latitude = obj.restaurant.latitude
        restaurant_longitude = obj.restaurant.longitude
        address_latitude = obj.address.latitude
        address_longitude = obj.address.longitude
        return self._distance_km_between_points(
            restaurant_latitude,
            restaurant_longitude,
            address_latitude,
            address_longitude,
        )

    def get_courier_name(self, obj):
        if not obj.courier:
            return ""
        return obj.courier.full_name or obj.courier.email

    def get_courier_phone(self, obj):
        if not obj.courier:
            return ""
        return getattr(getattr(obj.courier, "courier_profile", None), "phone", "") or obj.courier.phone or ""

    def get_courier_vehicle_type(self, obj):
        if not obj.courier:
            return ""
        return getattr(getattr(obj.courier, "courier_profile", None), "vehicle_type", "")

    def get_delivery_status(self, obj):
        delivery = getattr(obj, "delivery", None)
        return getattr(delivery, "status", "")

    def get_pickup_time(self, obj):
        delivery = getattr(obj, "delivery", None)
        return getattr(delivery, "pickup_time", None)

    def get_estimated_arrival_minutes(self, obj):
        if obj.fulfillment_type != FulfillmentType.DELIVERY or obj.order_status not in {OrderStatus.PICKED_UP, OrderStatus.ON_THE_WAY}:
            return None
        courier_profile = getattr(getattr(obj, "courier", None), "courier_profile", None)
        if not courier_profile or not obj.address:
            return None

        distance_km = self._distance_km_between_points(
            courier_profile.current_latitude,
            courier_profile.current_longitude,
            obj.address.latitude,
            obj.address.longitude,
        )
        if distance_km is None:
            return None

        speed_kmh = {
            "bike": 18,
            "walk": 5,
            "scooter": 28,
            "car": 24,
        }.get(courier_profile.vehicle_type, 22)
        minutes = max(3, round(distance_km / speed_kmh * 60))
        return minutes

    def _distance_km_between_points(self, start_latitude, start_longitude, end_latitude, end_longitude):
        if None in (start_latitude, start_longitude, end_latitude, end_longitude):
            return None

        from math import asin, cos, radians, sin, sqrt

        start_lat = radians(float(start_latitude))
        start_lng = radians(float(start_longitude))
        end_lat = radians(float(end_latitude))
        end_lng = radians(float(end_longitude))
        delta_lat = end_lat - start_lat
        delta_lng = end_lng - start_lng
        haversine = sin(delta_lat / 2) ** 2 + cos(start_lat) * cos(end_lat) * sin(delta_lng / 2) ** 2
        distance_km = 6371 * 2 * asin(sqrt(haversine))
        return round(distance_km, 1)

    class Meta:
        model = Order
        fields = (
            "id",
            "customer",
            "customer_name",
            "customer_phone",
            "customer_email",
            "restaurant",
            "restaurant_name",
            "restaurant_address",
            "restaurant_latitude",
            "restaurant_longitude",
            "courier",
            "courier_email",
            "courier_name",
            "courier_phone",
            "courier_vehicle_type",
            "address",
            "address_details",
            "address_summary",
            "subtotal",
            "delivery_fee",
            "discount",
            "total",
            "fulfillment_type",
            "fulfillment_type_label",
            "payment_method",
            "payment_method_label",
            "payment_status",
            "payment_status_label",
            "order_status",
            "order_status_label",
            "customer_note",
            "restaurant_note",
            "estimated_delivery_window_minutes",
            "estimated_distance_km",
            "estimated_arrival_minutes",
            "delivery_status",
            "pickup_time",
            "dispatch_offer_expires_at",
            "dispatch_distance_km",
            "items",
            "events",
            "review",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class OrderCreateItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True)
    ingredient_price_adjustment = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, min_value=Decimal("0.00"))
    option_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )


class OrderCreateSerializer(serializers.Serializer):
    restaurant_id = serializers.IntegerField()
    address_id = serializers.IntegerField(required=False)
    items = OrderCreateItemSerializer(many=True)
    promo_code = serializers.CharField(required=False, allow_blank=True)
    fulfillment_type = serializers.ChoiceField(choices=FulfillmentType.choices, default=FulfillmentType.DELIVERY)
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    customer_note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        request = self.context["request"]
        if not request.user.is_customer:
            raise serializers.ValidationError("Only customer accounts can create orders.")

        try:
            restaurant = Restaurant.objects.get(
                id=attrs["restaurant_id"],
                is_active=True,
            )
        except Restaurant.DoesNotExist as exc:
            raise serializers.ValidationError({"restaurant_id": "Restaurant not found."}) from exc

        if not restaurant.is_open:
            raise serializers.ValidationError({"restaurant_id": "Restaurant is currently closed."})

        fulfillment_type = attrs.get("fulfillment_type", FulfillmentType.DELIVERY)
        address = None
        if fulfillment_type == FulfillmentType.PICKUP:
            if not restaurant.supports_pickup:
                raise serializers.ValidationError({"fulfillment_type": "Pickup is not available for this restaurant."})
        else:
            address_id = attrs.get("address_id")
            if not address_id:
                raise serializers.ValidationError({"address_id": "Address is required for delivery orders."})

            try:
                address = Address.objects.get(id=address_id, user=request.user)
            except Address.DoesNotExist as exc:
                raise serializers.ValidationError({"address_id": "Address not found."}) from exc

        if not attrs["items"]:
            raise serializers.ValidationError({"items": "At least one item is required."})

        calculated_items = []
        subtotal = Decimal("0.00")

        for item in attrs["items"]:
            try:
                product = Product.objects.prefetch_related("option_groups").get(
                    id=item["product_id"],
                    restaurant=restaurant,
                    is_available=True,
                )
            except Product.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"items": f"Product {item['product_id']} is not available for this restaurant."}
                ) from exc

            selected_options = self._validate_options(product, item.get("option_ids", []))
            option_total = sum((option.extra_price for option in selected_options), Decimal("0.00"))
            ingredient_price_adjustment = item.get("ingredient_price_adjustment") or Decimal("0.00")
            unit_price = product.effective_price + ingredient_price_adjustment
            line_total = (unit_price + option_total) * item["quantity"]
            subtotal += line_total
            calculated_items.append(
                {
                    "product": product,
                    "quantity": item["quantity"],
                    "notes": item.get("notes", ""),
                    "unit_price": unit_price,
                    "line_total": line_total,
                    "ingredient_price_adjustment": ingredient_price_adjustment,
                    "options": selected_options,
                }
            )

        if subtotal < restaurant.minimum_order:
            raise serializers.ValidationError(
                {"items": f"Minimum order value is {restaurant.minimum_order}."}
            )

        discount = self._calculate_discount(attrs.get("promo_code", ""), subtotal)
        delivery_fee = Decimal("0.00") if fulfillment_type == FulfillmentType.PICKUP else restaurant.delivery_fee
        total = subtotal + delivery_fee - discount

        attrs["_calculated"] = {
            "restaurant": restaurant,
            "address": address,
            "fulfillment_type": fulfillment_type,
            "items": calculated_items,
            "subtotal": subtotal,
            "delivery_fee": delivery_fee,
            "discount": discount,
            "total": max(total, Decimal("0.00")),
        }
        return attrs

    def _validate_options(self, product, option_ids):
        if len(option_ids) != len(set(option_ids)):
            raise serializers.ValidationError({"items": "Duplicate product options are not allowed."})

        selected_options = list(
            ProductOption.objects.select_related("option_group").filter(
                id__in=option_ids,
                is_available=True,
            )
        )
        if len(selected_options) != len(option_ids):
            raise serializers.ValidationError({"items": "One or more selected options are unavailable."})

        selected_by_group = defaultdict(list)
        for option in selected_options:
            if option.option_group.product_id != product.id:
                raise serializers.ValidationError(
                    {"items": f"Option {option.id} does not belong to product {product.id}."}
                )
            selected_by_group[option.option_group_id].append(option)

        groups = product.option_groups.all()
        group_counts = Counter({group.id: len(selected_by_group[group.id]) for group in groups})
        for group in groups:
            count = group_counts[group.id]
            if group.is_required and count < group.min_select:
                raise serializers.ValidationError({"items": f"{group.name} requires at least {group.min_select} choice(s)."})
            if count and count < group.min_select:
                raise serializers.ValidationError({"items": f"{group.name} requires at least {group.min_select} choice(s)."})
            if count > group.max_select:
                raise serializers.ValidationError({"items": f"{group.name} allows at most {group.max_select} choice(s)."})
        return selected_options

    def _calculate_discount(self, code, subtotal):
        if not code:
            return Decimal("0.00")
        try:
            promo = PromoCode.objects.get(code__iexact=code.strip())
        except PromoCode.DoesNotExist as exc:
            raise serializers.ValidationError({"promo_code": "Promo code is invalid."}) from exc

        if not promo.is_valid_for(subtotal, timezone.now()):
            raise serializers.ValidationError({"promo_code": "Promo code cannot be applied."})

        if promo.discount_type == DiscountType.PERCENT:
            discount = subtotal * promo.discount_value / Decimal("100")
        else:
            discount = promo.discount_value

        if promo.max_discount is not None:
            discount = min(discount, promo.max_discount)
        return min(discount, subtotal)

    @transaction.atomic
    def create(self, validated_data):
        calculated = validated_data["_calculated"]
        payment_method = validated_data.get("payment_method", PaymentMethod.CASH)
        payment_status = PaymentStatus.UNPAID if payment_method == PaymentMethod.CASH else PaymentStatus.PENDING

        order = Order.objects.create(
            customer=self.context["request"].user,
            restaurant=calculated["restaurant"],
            address=calculated["address"],
            subtotal=calculated["subtotal"],
            delivery_fee=calculated["delivery_fee"],
            discount=calculated["discount"],
            total=calculated["total"],
            fulfillment_type=calculated["fulfillment_type"],
            payment_method=payment_method,
            payment_status=payment_status,
            customer_note=validated_data.get("customer_note", ""),
        )

        for item in calculated["items"]:
            order_item = OrderItem.objects.create(
                order=order,
                product=item["product"],
                product_name=item["product"].name,
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                total_price=item["line_total"],
                notes=item["notes"],
            )
            OrderItemOption.objects.bulk_create(
                [
                    OrderItemOption(
                        order_item=order_item,
                        option_name=option.name,
                        extra_price=option.extra_price,
                    )
                    for option in item["options"]
                ]
            )

        provider = payment_provider_for_method(payment_method)
        Payment.objects.create(order=order, provider=provider, amount=order.total, status=payment_status)
        from orders.history import log_order_created

        log_order_created(order, actor=self.context["request"].user)
        if payment_method == PaymentMethod.CASH:
            from orders.notifications import queue_order_created_push

            queue_order_created_push(order)
        return order

    def to_representation(self, instance):
        return OrderSerializer(instance, context=self.context).data


class RestaurantOwnerOrderStatusSerializer(serializers.Serializer):
    order_status = serializers.ChoiceField(
        choices=(
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.REJECTED,
            OrderStatus.CANCELLED,
        )
    )
    restaurant_note = serializers.CharField(required=False, allow_blank=True)


class CourierOrderStatusSerializer(serializers.Serializer):
    order_status = serializers.ChoiceField(
        choices=(
            OrderStatus.PICKED_UP,
            OrderStatus.ON_THE_WAY,
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED,
        )
    )
