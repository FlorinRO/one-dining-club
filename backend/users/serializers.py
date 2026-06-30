import json
import logging
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl
from urllib.request import Request, urlopen

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from jwt import DecodeError, InvalidTokenError, PyJWKClient, PyJWKClientError, decode as jwt_decode

from core.email import EmailDeliveryError, send_transactional_email
from users.models import CustomerProfile, PushDevice, PushDevicePlatform, SocialAccount, User, UserRole

logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "phone",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_active",
            "last_login",
            "date_joined",
        )
        read_only_fields = ("id", "role", "is_active", "last_login", "date_joined")


def validate_expo_push_token(value):
    token = value.strip()
    if not token:
        return token
    if not (token.startswith("ExpoPushToken[") or token.startswith("ExponentPushToken[")):
        raise serializers.ValidationError("Expo push token is invalid.")
    return token


class PushDeviceRegisterSerializer(serializers.ModelSerializer):
    expo_push_token = serializers.CharField()
    platform = serializers.ChoiceField(choices=PushDevicePlatform.choices, default=PushDevicePlatform.UNKNOWN)
    device_id = serializers.CharField(required=False, allow_blank=True, max_length=128)
    app_version = serializers.CharField(required=False, allow_blank=True, max_length=32)

    class Meta:
        model = PushDevice
        fields = (
            "id",
            "expo_push_token",
            "platform",
            "device_id",
            "app_version",
            "is_active",
            "last_registered_at",
        )
        read_only_fields = ("id", "is_active", "last_registered_at")

    def validate_expo_push_token(self, value):
        return validate_expo_push_token(value)

    def create(self, validated_data):
        user = self.context["request"].user
        token = validated_data["expo_push_token"]
        device_id = validated_data.get("device_id", "")

        if device_id:
            PushDevice.objects.filter(user=user, device_id=device_id).exclude(expo_push_token=token).update(
                is_active=False,
            )

        device, _ = PushDevice.objects.update_or_create(
            expo_push_token=token,
            defaults={
                "user": user,
                "platform": validated_data.get("platform", PushDevicePlatform.UNKNOWN),
                "device_id": device_id,
                "app_version": validated_data.get("app_version", ""),
                "is_active": True,
                "last_registered_at": timezone.now(),
            },
        )
        return device


class PushDeviceUnregisterSerializer(serializers.Serializer):
    expo_push_token = serializers.CharField(required=False, allow_blank=True)
    device_id = serializers.CharField(required=False, allow_blank=True, max_length=128)

    def validate_expo_push_token(self, value):
        return validate_expo_push_token(value)

    def validate(self, attrs):
        if not attrs.get("expo_push_token") and not attrs.get("device_id"):
            raise serializers.ValidationError("expo_push_token or device_id is required.")
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        queryset = PushDevice.objects.filter(user=user, is_active=True)
        if self.validated_data.get("expo_push_token"):
            queryset = queryset.filter(expo_push_token=self.validated_data["expo_push_token"])
        else:
            queryset = queryset.filter(device_id=self.validated_data["device_id"])
        return queryset.update(is_active=False)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "phone", "first_name", "last_name", "password")
        read_only_fields = ("id",)

    def validate_email(self, value):
        email = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(
            password=password,
            role=UserRole.CUSTOMER,
            is_active=False,
            **validated_data,
        )
        CustomerProfile.objects.create(user=user, phone_number=user.phone)
        try:
            self.verification = send_email_verification(user)
        except EmailDeliveryError as exc:
            raise serializers.ValidationError(
                {"email": "Nu am putut trimite emailul de confirmare. Incearca din nou mai tarziu."}
            ) from exc
        return user


def build_email_verification(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    url = settings.EMAIL_VERIFICATION_CONFIRM_URL.format(uid=uid, token=token)
    return {"uid": uid, "token": token, "url": url}


def send_email_verification(user):
    verification = build_email_verification(user)
    send_transactional_email(
        subject="Confirma emailul pentru Yumzy",
        message=(
            "Bun venit la Yumzy.\n\n"
            "Pentru a activa contul, deschide linkul de mai jos:\n"
            f"{verification['url']}\n\n"
            "Daca nu ai creat acest cont, poti ignora mesajul."
        ),
        html_message=render_transactional_email(
            "users/emails/email_verification.html",
            {
                "headline": "Confirmă emailul",
                "body": "Apasă pe butonul de mai jos pentru a activa contul tău Yumzy.",
                "button_label": "Confirmă emailul",
                "button_url": verification["url"],
                "footnote": "Dacă nu ai creat acest cont, poți ignora acest mesaj.",
            },
        ),
        recipient_list=[user.email],
    )
    return verification if settings.DEBUG else None


def send_welcome_email(user):
    send_transactional_email(
        subject="Bun venit la Yumzy",
        message=(
            "Bun venit la Yumzy.\n\n"
            "Contul tau este activ si poti incepe sa explorezi restaurantele si sa plasezi comenzi.\n\n"
            f"Deschide Yumzy: {settings.FRONTEND_URL}\n\n"
            f"Pentru ajutor ne poti scrie la: {settings.SUPPORT_EMAIL}"
        ),
        html_message=render_transactional_email(
            "users/emails/welcome.html",
            {
                "headline": "Bine ai venit la Yumzy",
                "body": "Contul tău este activ. Poți începe chiar acum să explorezi restaurantele și să comanzi.",
                "button_label": "Deschide Yumzy",
                "button_url": settings.FRONTEND_URL,
                "footnote": "Dacă ai nevoie de ajutor, echipa noastră îți răspunde rapid.",
            },
        ),
        recipient_list=[user.email],
    )


def build_password_reset(user, *, flow=None, confirm_url=None):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base_url = confirm_url or settings.PASSWORD_RESET_CONFIRM_URL
    url = base_url.format(uid=uid, token=token)
    if flow:
        parsed = urlsplit(url)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        query["flow"] = flow
        url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment))
    return {"uid": uid, "token": token, "url": url}


def render_transactional_email(template_name, context):
    return render_to_string(
        template_name,
        {
            "site_url": settings.SITE_URL,
            "support_email": settings.SUPPORT_EMAIL,
            **context,
        },
    )


def send_password_reset_email(
    user,
    *,
    flow=None,
    confirm_url=None,
    subject="Resetare parola Yumzy",
    headline="Resetează parola",
    title_html="resetare<br />parolă",
    body="Apasă pe butonul de mai jos pentru a seta o parolă nouă pentru contul tău Yumzy.",
    button_label="Setează parola nouă",
    footnote="Dacă nu ai cerut resetarea parolei, poți ignora acest mesaj.",
    intro_message="Ai cerut resetarea parolei pentru contul Yumzy.",
    intro_text="Am primit o cerere de resetare a parolei pentru contul tău Yumzy.",
    security_note="Dacă nu ai cerut schimbarea parolei, nu este nevoie să faci nimic. Contul tău rămâne în siguranță.",
):
    reset = build_password_reset(user, flow=flow, confirm_url=confirm_url)
    send_transactional_email(
        subject=subject,
        message=(
            f"{intro_message}\n\n"
            f"Deschide linkul pentru a seta o parola noua:\n{reset['url']}\n\n"
            "Daca nu ai cerut asta, poti ignora mesajul."
        ),
        html_message=render_transactional_email(
            "users/emails/password_reset.html",
            {
                "headline": headline,
                "title_html": title_html,
                "intro_text": intro_text,
                "body": body,
                "button_label": button_label,
                "button_url": reset["url"],
                "footnote": footnote,
                "security_note": security_note,
            },
        ),
        recipient_list=[user.email],
    )
    return reset


def validate_password_reset_user(uid, token):
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id, is_active=True)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist) as exc:
        raise serializers.ValidationError({"uid": "Linkul pentru resetarea parolei nu este valid."}) from exc

    if not default_token_generator.check_token(user, token):
        raise serializers.ValidationError({"token": "Linkul pentru resetarea parolei este invalid sau expirat."})

    return user


def build_auth_response(user, context=None):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": UserSerializer(user, context=context or {}).data,
    }


class LoginSerializer(TokenObtainPairSerializer):
    username_field = "email"

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        existing_user = User.objects.filter(email__iexact=email).first()
        if existing_user and not existing_user.is_active and existing_user.check_password(password):
            raise serializers.ValidationError("Confirma emailul inainte de autentificare.")

        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )
        if not user:
            raise serializers.ValidationError("Emailul sau parola nu sunt corecte.")
        if not user.is_active:
            raise serializers.ValidationError("Contul nu este activ.")

        return build_auth_response(user, self.context)


class SocialLoginSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=("google", "facebook", "apple"))
    access_token = serializers.CharField(required=False, allow_blank=True)
    id_token = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        provider = attrs["provider"]
        token = attrs.get("id_token") or attrs.get("access_token")
        if not token:
            raise serializers.ValidationError("A Google, Facebook, or Apple token is required.")

        profile = self._fetch_profile(provider, token, bool(attrs.get("id_token")))
        subject = profile.get("subject")
        if not subject:
            raise serializers.ValidationError("The social account did not return a valid subject identifier.")

        email = profile.get("email")
        social_account = SocialAccount.objects.select_related("user").filter(provider=provider, subject=subject).first()
        created = False

        if social_account:
            user = social_account.user
        else:
            if not email:
                raise serializers.ValidationError("The social account did not return an email address.")
            user, created = User.objects.get_or_create(
                email=User.objects.normalize_email(email),
                defaults={
                    "first_name": profile.get("first_name", ""),
                    "last_name": profile.get("last_name", ""),
                    "role": UserRole.CUSTOMER,
                },
            )
            SocialAccount.objects.get_or_create(user=user, provider=provider, subject=subject)

        updated_fields = []
        if profile.get("first_name") and not user.first_name:
            user.first_name = profile["first_name"]
            updated_fields.append("first_name")
        if profile.get("last_name") and not user.last_name:
            user.last_name = profile["last_name"]
            updated_fields.append("last_name")

        if created:
            user.is_active = True
            user.set_unusable_password()
            updated_fields.extend(["is_active", "password"])
            try:
                send_welcome_email(user)
            except Exception:
                logger.exception(
                    "Welcome email failed during social signup.",
                    extra={"provider": provider, "user_id": user.pk, "email": user.email},
                )
        elif not user.is_active:
            user.is_active = True
            updated_fields.append("is_active")
            try:
                send_welcome_email(user)
            except Exception:
                logger.exception(
                    "Welcome email failed during social reactivation.",
                    extra={"provider": provider, "user_id": user.pk, "email": user.email},
                )

        if updated_fields:
            user.save(update_fields=list(dict.fromkeys(updated_fields)))
        CustomerProfile.objects.get_or_create(user=user, defaults={"phone_number": user.phone})

        return build_auth_response(user, self.context)

    def _fetch_profile(self, provider, token, is_id_token):
        if provider == "google":
            if is_id_token:
                params = urlencode({"id_token": token})
                data = self._get_json(f"https://oauth2.googleapis.com/tokeninfo?{params}")
                if data.get("email_verified") not in (True, "true", "True"):
                    raise serializers.ValidationError("Google email is not verified.")
            else:
                data = self._get_json(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {token}"},
                )
            return {
                "subject": data.get("sub"),
                "email": data.get("email"),
                "first_name": data.get("given_name", ""),
                "last_name": data.get("family_name", ""),
            }

        if provider == "apple":
            return self._fetch_apple_profile(token)

        params = urlencode(
            {
                "fields": "id,email,first_name,last_name",
                "access_token": token,
            }
        )
        data = self._get_json(f"https://graph.facebook.com/me?{params}")
        return {
            "subject": data.get("id"),
            "email": data.get("email"),
            "first_name": data.get("first_name", ""),
            "last_name": data.get("last_name", ""),
        }

    def _fetch_apple_profile(self, token):
        try:
            signing_key = PyJWKClient("https://appleid.apple.com/auth/keys").get_signing_key_from_jwt(token)
            data = jwt_decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=settings.APPLE_SIGN_IN_AUDIENCES,
                issuer="https://appleid.apple.com",
            )
        except (InvalidTokenError, DecodeError, PyJWKClientError, URLError, TimeoutError, ValueError) as exc:
            raise serializers.ValidationError("Could not verify the social login token.") from exc
        except Exception as exc:
            logger.exception("Unexpected Apple token verification failure.")
            raise serializers.ValidationError("Could not verify the social login token.") from exc

        return {
            "subject": data.get("sub"),
            "email": data.get("email"),
            "first_name": "",
            "last_name": "",
        }

    def _get_json(self, url, headers=None):
        request = Request(url, headers=headers or {})
        try:
            with urlopen(request, timeout=8) as response:
                return json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise serializers.ValidationError("Could not verify the social login token.") from exc


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self):
        email = User.objects.normalize_email(self.validated_data["email"])
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            return None

        try:
            reset = send_password_reset_email(user)
        except EmailDeliveryError:
            return None
        return reset if settings.DEBUG else None


class EmailVerificationConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()

    def validate(self, attrs):
        try:
            user_id = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist) as exc:
            raise serializers.ValidationError({"uid": "Linkul de confirmare nu este valid."}) from exc

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": "Linkul de confirmare este invalid sau expirat."})

        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        was_inactive = not user.is_active
        if was_inactive:
            user.is_active = True
            user.save(update_fields=("is_active",))
            try:
                send_welcome_email(user)
            except EmailDeliveryError:
                pass
        return user


class EmailVerificationRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self):
        email = User.objects.normalize_email(self.validated_data["email"])
        user = User.objects.filter(email__iexact=email, is_active=False).first()
        if not user:
            return None
        try:
            return send_email_verification(user)
        except EmailDeliveryError:
            return None


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        user = validate_password_reset_user(attrs["uid"], attrs["token"])
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Parolele nu coincid."})
        validate_password(attrs["new_password"], user)
        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=("password",))
        return user
