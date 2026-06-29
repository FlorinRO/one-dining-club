from orders.models import OrderEvent


def log_order_created(order, *, actor=None, source="customer_create"):
    return OrderEvent.objects.create(
        order=order,
        actor=actor,
        event_type=OrderEvent.EventType.CREATED,
        source=source,
        next_status=order.order_status,
    )


def log_order_status_changed(order, *, previous_status="", actor=None, source=""):
    return OrderEvent.objects.create(
        order=order,
        actor=actor,
        event_type=OrderEvent.EventType.STATUS_CHANGED,
        source=source,
        previous_status=previous_status or "",
        next_status=order.order_status,
    )


def log_order_courier_assigned(order, *, courier=None, actor=None, source="restaurant"):
    return OrderEvent.objects.create(
        order=order,
        actor=actor,
        courier=courier,
        event_type=OrderEvent.EventType.COURIER_ASSIGNED,
        source=source,
        next_status=order.order_status,
    )
