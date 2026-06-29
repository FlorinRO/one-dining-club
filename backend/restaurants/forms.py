from django import forms

from core.email import EmailDeliveryError
from restaurants.models import Restaurant
from users.models import User, UserRole
from users.serializers import send_password_reset_email


class RestaurantAdminForm(forms.ModelForm):
    owner_email = forms.EmailField(
        required=False,
        label="Restaurant owner email",
        help_text="Dacă owner-ul nu există, contul va fi creat automat și va primi email pentru setarea parolei.",
    )
    send_setup_email = forms.BooleanField(
        required=False,
        initial=True,
        label="Trimite email de activare",
    )

    class Meta:
        model = Restaurant
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["owner"].required = False
        self.setup_email_sent = False
        self.setup_email_failed = False
        self.owner_was_created = False

        if self.instance.pk and self.instance.owner_id:
            self.fields["owner_email"].initial = self.instance.owner.email

    def clean_owner_email(self):
        value = self.cleaned_data.get("owner_email", "")
        return User.objects.normalize_email(value).strip()

    def clean(self):
        cleaned_data = super().clean()
        owner = cleaned_data.get("owner")
        owner_email = cleaned_data.get("owner_email", "")

        if not owner and not owner_email:
            raise forms.ValidationError("Selectează un owner sau introdu emailul restaurantului.")

        if owner_email:
            existing_user = User.objects.filter(email__iexact=owner_email).first()
            if existing_user and existing_user.role not in {UserRole.RESTAURANT_OWNER, UserRole.ADMIN}:
                raise forms.ValidationError(
                    "Există deja un cont pe acest email cu alt rol. Folosește alt email sau convertește contul manual."
                )

        return cleaned_data

    def save(self, commit=True):
        restaurant = super().save(commit=False)
        owner = self.cleaned_data.get("owner")
        owner_email = self.cleaned_data.get("owner_email", "")
        send_setup_email = self.cleaned_data.get("send_setup_email", False)

        if not owner and owner_email:
            owner = User.objects.filter(email__iexact=owner_email).first()
            if not owner:
                owner = User.objects.create_user(
                    email=owner_email,
                    password=None,
                    role=UserRole.RESTAURANT_OWNER,
                    is_active=True,
                )
                self.owner_was_created = True
            elif owner.role == UserRole.RESTAURANT_OWNER and not owner.is_active:
                owner.is_active = True
                owner.save(update_fields=("is_active",))

        restaurant.owner = owner
        if owner and not restaurant.email:
            restaurant.email = owner.email

        if commit:
            restaurant.save()
            self.save_m2m()

        if owner and send_setup_email:
            try:
                send_password_reset_email(
                    owner,
                    subject="Activează contul restaurantului în Yumzy",
                    headline="Activează contul restaurantului",
                    body=(
                        f"Contul pentru {restaurant.name} este pregătit. "
                        "Apasă pe butonul de mai jos pentru a seta parola și a intra în dashboard."
                    ),
                    button_label="Activează contul",
                    footnote="Dacă nu te așteptai la acest mesaj, contactează echipa Yumzy.",
                    intro_message=(
                        f"Contul restaurantului {restaurant.name} a fost creat în Yumzy."
                    ),
                )
                self.setup_email_sent = True
            except EmailDeliveryError:
                self.setup_email_failed = True

        return restaurant
