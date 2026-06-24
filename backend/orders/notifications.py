import logging

from django.db import transaction

from core.push import send_push_to_user, send_push_to_users
from orders.models import FulfillmentType, Order, OrderStatus, PaymentStatus
from users.models import User, UserRole

logger = logging.getLogger(__name__)


CUSTOMER_STATUS_MESSAGES = {
    OrderStatus.ACCEPTED: ("Comanda a fost acceptata", "{restaurant} a acceptat comanda #{order_id}."),
    OrderStatus.PREPARING: ("Comanda este in preparare", "{restaurant} pregateste comanda #{order_id}."),
    OrderStatus.READY_FOR_PICKUP: (
        "Comanda este gata",
        "{restaurant} a marcat comanda #{order_id} ca gata de ridicare.",
    ),
    OrderStatus.PICKED_UP: ("Comanda a fost preluata", "Curierul a preluat comanda #{order_id}."),
    OrderStatus.ON_THE_WAY: ("Comanda este pe drum", "Curierul este pe drum cu comanda #{order_id}."),
    OrderStatus.DELIVERED: ("Comanda a fost livrata", "Pofta buna! Poti lasa un review pentru comanda #{order_id}."),
    OrderStatus.CANCELLED: ("Comanda a fost anulata", "Comanda #{order_id} a fost anulata."),
    OrderStatus.REJECTED: ("Comanda a fost respinsa", "{restaurant} nu poate onora comanda #{order_id}."),
}


def queue_order_created_push(order):
    order_id = order.id
    transaction.on_commit(lambda: send_order_created_push(order_id))


def queue_order_status_push(order, *, previous_status=None, source="system"):
    if previous_status == order.order_status:
        return

    order_id = order.id
    transaction.on_commit(lambda: send_order_status_push(order_id, source=source))


def queue_payment_status_push(order):
    order_id = order.id
    transaction.on_commit(lambda: send_payment_status_push(order_id))


def send_order_created_push(order_id):
    order = _get_order(order_id)
    if not order:
        return

    payload = _order_payload(order, "order_created")
    send_push_to_user(
        order.customer,
        title="Comanda plasata cu succes",
        body=f"Comanda #{order.id} a fost plasata cu succes la {order.restaurant.name}.",
        data=payload,
    )

    if order.restaurant.owner_id:
        send_push_to_user(
            order.restaurant.owner,
            title="Comanda noua",
            body=f"{order.customer.full_name or order.customer.email} a plasat comanda #{order.id}.",
            data=payload,
        )


def send_order_status_push(order_id, *, source="system"):
    order = _get_order(order_id)
    if not order:
        return

    payload = _order_payload(order, "order_status_changed")
    message = CUSTOMER_STATUS_MESSAGES.get(order.order_status)
    if message and source != "customer_cancel":
        title, body_template = message
        send_push_to_user(
            order.customer,
            title=title,
            body=body_template.format(restaurant=order.restaurant.name, order_id=order.id),
            data=payload,
        )

    if order.order_status == OrderStatus.READY_FOR_PICKUP and order.fulfillment_type == FulfillmentType.DELIVERY:
        couriers = User.objects.filter(role=UserRole.COURIER, is_active=True)
        send_push_to_users(
            couriers,
            title="Comanda gata de ridicare",
            body=f"Comanda #{order.id} este gata la {order.restaurant.name}.",
            data=payload,
        )

    if source == "customer_cancel" and order.restaurant.owner_id:
        send_push_to_user(
            order.restaurant.owner,
            title="Comanda anulata",
            body=f"Clientul a anulat comanda #{order.id}.",
            data=payload,
        )


def send_payment_status_push(order_id):
    order = _get_order(order_id)
    if not order:
        return

    if order.payment_status != PaymentStatus.FAILED:
        return

    send_push_to_user(
        order.customer,
        title="Plata a esuat",
        body=f"Plata pentru comanda #{order.id} nu a putut fi finalizata.",
        data=_order_payload(order, "payment_failed"),
    )


def _get_order(order_id):
    try:
        return Order.objects.select_related("customer", "restaurant", "restaurant__owner").get(id=order_id)
    except Order.DoesNotExist:
        logger.warning("Skipping push notification for missing order.", extra={"order_id": order_id})
        return None


def _order_payload(order, event):
    return {
        "event": event,
        "order_id": order.id,
        "order_status": order.order_status,
        "payment_status": order.payment_status,
        "restaurant_id": order.restaurant_id,
    }
