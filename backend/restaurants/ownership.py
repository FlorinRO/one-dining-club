from restaurants.models import Restaurant


def get_primary_restaurant_id_for_owner(user):
    if not user or not user.is_authenticated:
        return None
    return Restaurant.objects.filter(owner=user).order_by("id").values_list("id", flat=True).first()


def get_primary_restaurant_for_owner(user):
    primary_id = get_primary_restaurant_id_for_owner(user)
    if not primary_id:
        return None
    return Restaurant.objects.get(id=primary_id)
