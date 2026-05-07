import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.contrib.auth import authenticate
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import CustomerProfile, User, UserRole


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
            "date_joined",
        )
        read_only_fields = ("id", "role", "is_active", "date_joined")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "phone", "first_name", "last_name", "password")
        read_only_fields = ("id",)

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(
            password=password,
            role=UserRole.CUSTOMER,
            **validated_data,
        )
        CustomerProfile.objects.create(user=user, phone_number=user.phone)
        return user


class LoginSerializer(TokenObtainPairSerializer):
    username_field = "email"

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("User account is disabled.")

        refresh = self.get_token(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user, context=self.context).data,
        }


class SocialLoginSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=("google", "facebook"))
    access_token = serializers.CharField(required=False, allow_blank=True)
    id_token = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        provider = attrs["provider"]
        token = attrs.get("id_token") or attrs.get("access_token")
        if not token:
            raise serializers.ValidationError("A Google or Facebook token is required.")

        profile = self._fetch_profile(provider, token, bool(attrs.get("id_token")))
        email = profile.get("email")
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
        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])
        elif not user.is_active:
            raise serializers.ValidationError("User account is disabled.")
        CustomerProfile.objects.get_or_create(user=user, defaults={"phone_number": user.phone})

        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user, context=self.context).data,
        }

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
                "email": data.get("email"),
                "first_name": data.get("given_name", ""),
                "last_name": data.get("family_name", ""),
            }

        params = urlencode(
            {
                "fields": "id,email,first_name,last_name",
                "access_token": token,
            }
        )
        data = self._get_json(f"https://graph.facebook.com/me?{params}")
        return {
            "email": data.get("email"),
            "first_name": data.get("first_name", ""),
            "last_name": data.get("last_name", ""),
        }

    def _get_json(self, url, headers=None):
        request = Request(url, headers=headers or {})
        try:
            with urlopen(request, timeout=8) as response:
                return json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise serializers.ValidationError("Could not verify the social login token.") from exc
