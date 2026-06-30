from django.conf import settings
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.shortcuts import render, redirect
from django.urls import reverse
import logging
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from users.serializers import (
    EmailVerificationConfirmSerializer,
    EmailVerificationRequestSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PushDeviceRegisterSerializer,
    PushDeviceUnregisterSerializer,
    RegisterSerializer,
    SocialLoginSerializer,
    UserSerializer,
    validate_password_reset_user,
)

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        headers = self.get_success_headers(serializer.data)
        payload = {
            "detail": "Cont creat. Verifica emailul pentru confirmare inainte de autentificare.",
            "email": user.email,
            "requires_email_verification": True,
        }
        verification = getattr(serializer, "verification", None)
        if settings.DEBUG and verification:
            payload["debug"] = verification
        return Response(payload, status=status.HTTP_201_CREATED, headers=headers)


def extract_error_message(detail):
    if isinstance(detail, list):
        return extract_error_message(detail[0]) if detail else "Linkul de confirmare nu este valid."
    if isinstance(detail, dict):
        for value in detail.values():
            return extract_error_message(value)
    if isinstance(detail, str):
        return detail
    return "Linkul de confirmare nu este valid."


def build_email_verification_page_context(success, detail):
    return {
        "success": success,
        "title": "Email confirmat" if success else "Link invalid sau expirat",
        "message": detail,
        "app_url": settings.EMAIL_VERIFICATION_APP_URL,
        "support_email": settings.SUPPORT_EMAIL,
    }


def is_mobile_request(request):
    user_agent = (request.META.get("HTTP_USER_AGENT") or "").lower()
    return any(marker in user_agent for marker in ("iphone", "android", "ipad", "mobile", "ipod"))


def build_password_reset_result_context(success, detail, *, flow="password_reset", is_mobile=False):
    if flow == "restaurant_onboarding":
        return {
            "success": success,
            "title": "Cont activat" if success else "Link invalid sau expirat",
            "message": detail,
            "primary_action_url": settings.RESTAURANT_DASHBOARD_URL,
            "primary_action_label": "Deschide dashboardul" if is_mobile else "Intră în dashboard",
            "secondary_action_url": settings.SITE_URL if success else f"mailto:{settings.SUPPORT_EMAIL}",
            "secondary_action_label": "Mergi la Yumzy" if success else "Contactează suportul",
            "support_email": settings.SUPPORT_EMAIL,
        }
    return {
        "success": success,
        "title": "Parolă resetată" if success else "Link invalid sau expirat",
        "message": detail,
        "primary_action_url": settings.EMAIL_VERIFICATION_APP_URL if is_mobile else settings.FRONTEND_URL,
        "primary_action_label": "Deschide aplicația" if is_mobile else "Deschide Yumzy",
        "secondary_action_url": settings.FRONTEND_URL if success else f"mailto:{settings.SUPPORT_EMAIL}",
        "secondary_action_label": "Intră în cont" if success else "Contactează suportul",
        "support_email": settings.SUPPORT_EMAIL,
    }


def build_password_reset_form_context(
    *, uid, token, flow="password_reset", is_mobile=False, password_error="", confirm_password_error=""
):
    if flow == "restaurant_onboarding":
        return {
            "title": "Activează contul restaurantului",
            "message": "Setează parola pentru a intra în dashboardul restaurantului tău.",
            "uid": uid,
            "token": token,
            "flow": flow,
            "is_mobile": is_mobile,
            "password_error": password_error,
            "confirm_password_error": confirm_password_error,
        }
    return {
        "title": "Setează parola nouă",
        "message": "Alege o parolă nouă pentru contul tău Yumzy.",
        "uid": uid,
        "token": token,
        "flow": flow,
        "is_mobile": is_mobile,
        "password_error": password_error,
        "confirm_password_error": confirm_password_error,
    }


def anonymize_user(user):
    user.addresses.update(
        label="Deleted",
        full_name="",
        phone="",
        address_line_1="",
        address_line_2="",
        city="",
        postcode="",
        instructions="",
        is_default=False,
        latitude=None,
        longitude=None,
    )
    anonymized_email = f"deleted-user-{user.pk}@deleted.yumzy.local"
    user.email = anonymized_email
    user.first_name = ""
    user.last_name = ""
    user.phone = ""
    user.is_active = False
    user.set_unusable_password()
    user.save(update_fields=("email", "first_name", "last_name", "phone", "is_active", "password"))


def delete_or_anonymize_user(user):
    with transaction.atomic():
        try:
            user.delete()
        except ProtectedError:
            anonymize_user(user)


class EmailVerificationConfirmPageView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        serializer = EmailVerificationConfirmSerializer(data=request.query_params)
        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
            context = build_email_verification_page_context(
                success=True,
                detail="Contul tău a fost confirmat. Poți reveni în aplicație și te poți autentifica.",
            )
            return render(request, "users/email_verification_result.html", context, status=status.HTTP_200_OK)
        except ValidationError as exc:
            context = build_email_verification_page_context(
                success=False,
                detail=extract_error_message(exc.detail),
            )
            return render(request, "users/email_verification_result.html", context, status=status.HTTP_400_BAD_REQUEST)


class EmailVerificationPreviewPageView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        success = request.query_params.get("success", "1").strip().lower() not in {"0", "false", "no"}
        context = build_email_verification_page_context(
            success=success,
            detail=(
                "Contul tău a fost confirmat. Poți reveni în aplicație și te poți autentifica."
                if success
                else "Linkul de confirmare este invalid sau a expirat. Cere un email nou din aplicație."
            ),
        )
        return render(
            request,
            "users/email_verification_result.html",
            context,
            status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST,
        )


class PasswordResetConfirmPageView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        uid = request.query_params.get("uid", "")
        token = request.query_params.get("token", "")
        flow = request.query_params.get("flow", "password_reset")
        is_mobile = is_mobile_request(request)
        try:
            validate_password_reset_user(uid, token)
        except ValidationError as exc:
            context = build_password_reset_result_context(
                success=False,
                detail=extract_error_message(exc.detail),
                flow=flow,
                is_mobile=is_mobile,
            )
            return render(request, "users/password_reset_result.html", context, status=status.HTTP_400_BAD_REQUEST)

        context = build_password_reset_form_context(uid=uid, token=token, flow=flow, is_mobile=is_mobile)
        return render(request, "users/password_reset_form.html", context, status=status.HTTP_200_OK)

    def post(self, request):
        flow = request.data.get("flow", "password_reset")
        is_mobile = is_mobile_request(request)
        payload = request.data.copy()
        payload.pop("flow", None)
        serializer = PasswordResetConfirmSerializer(data=payload)
        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
        except ValidationError as exc:
            detail = exc.detail if isinstance(exc.detail, dict) else {"new_password": exc.detail}
            if "uid" in detail or "token" in detail:
                context = build_password_reset_result_context(
                    success=False,
                    detail=extract_error_message(detail),
                    flow=flow,
                    is_mobile=is_mobile,
                )
                return render(
                    request,
                    "users/password_reset_result.html",
                    context,
                    status=status.HTTP_400_BAD_REQUEST,
                )

            context = build_password_reset_form_context(
                uid=request.data.get("uid", ""),
                token=request.data.get("token", ""),
                flow=flow,
                is_mobile=is_mobile,
                password_error=extract_error_message(detail.get("new_password", "")),
                confirm_password_error=extract_error_message(detail.get("confirm_password", "")),
            )
            return render(request, "users/password_reset_form.html", context, status=status.HTTP_400_BAD_REQUEST)

        context = build_password_reset_result_context(
            success=True,
            detail=(
                "Parola a fost setată. Poți intra acum în dashboardul restaurantului."
                if flow == "restaurant_onboarding"
                else "Parola ta a fost actualizată. Poți reveni în aplicație și te poți autentifica."
            ),
            flow=flow,
            is_mobile=is_mobile,
        )
        return render(request, "users/password_reset_result.html", context, status=status.HTTP_200_OK)


class PasswordResetPreviewPageView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        mode = request.query_params.get("mode", "form").strip().lower()
        flow = request.query_params.get("flow", "password_reset")
        is_mobile = is_mobile_request(request)
        if mode == "success":
            context = build_password_reset_result_context(
                success=True,
                detail=(
                    "Parola a fost setată. Poți intra acum în dashboardul restaurantului."
                    if flow == "restaurant_onboarding"
                    else "Parola ta a fost actualizată. Poți reveni în aplicație și te poți autentifica."
                ),
                flow=flow,
                is_mobile=is_mobile,
            )
            return render(request, "users/password_reset_result.html", context, status=status.HTTP_200_OK)
        if mode == "invalid":
            context = build_password_reset_result_context(
                success=False,
                detail="Linkul este invalid sau a expirat. Cere un link nou din emailul primit.",
                flow=flow,
                is_mobile=is_mobile,
            )
            return render(request, "users/password_reset_result.html", context, status=status.HTTP_400_BAD_REQUEST)

        context = build_password_reset_form_context(
            uid="preview-uid",
            token="preview-token",
            flow=flow,
            is_mobile=is_mobile,
        )
        return render(request, "users/password_reset_form.html", context, status=status.HTTP_200_OK)


class EmailTemplatePreviewView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        context = {
            "headline": "Confirmă emailul",
            "body": "Apasă pe butonul de mai jos pentru a activa contul tău Yumzy.",
            "button_label": "Confirmă emailul",
            "button_url": "https://api.yumzy.ro/verify-email/confirm/?uid=preview&token=preview",
            "footnote": "Dacă nu ai creat acest cont, poți ignora acest mesaj.",
            "support_email": settings.SUPPORT_EMAIL,
            "site_url": settings.SITE_URL,
        }
        return render(request, "users/emails/email_verification.html", context, status=status.HTTP_200_OK)


class PasswordResetEmailTemplatePreviewView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        context = {
            "headline": "Resetează parola",
            "body": "Apasă pe butonul de mai jos pentru a seta o parolă nouă pentru contul tău Yumzy.",
            "button_label": "Setează parola nouă",
            "button_url": "https://api.yumzy.ro/reset-password/confirm/?uid=preview&token=preview",
            "footnote": "Dacă nu ai cerut resetarea parolei, poți ignora acest mesaj.",
            "support_email": settings.SUPPORT_EMAIL,
            "site_url": settings.SITE_URL,
        }
        return render(request, "users/emails/password_reset.html", context, status=status.HTTP_200_OK)


class WelcomeEmailTemplatePreviewView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        context = {
            "headline": "Bine ai venit la Yumzy",
            "body": "Contul tău este activ. Poți începe chiar acum să explorezi restaurantele și să comanzi.",
            "button_label": "Deschide Yumzy",
            "button_url": settings.SITE_URL,
            "footnote": "Dacă ai nevoie de ajutor, echipa noastră îți răspunde rapid.",
            "support_email": settings.SUPPORT_EMAIL,
            "site_url": settings.SITE_URL,
        }
        return render(request, "users/emails/welcome.html", context, status=status.HTTP_200_OK)


class LoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class SocialLoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        try:
            serializer = SocialLoginSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            return Response(serializer.validated_data)
        except Exception:
            logger.exception(
                "Social login request failed.",
                extra={
                    "provider": request.data.get("provider"),
                    "has_access_token": bool(request.data.get("access_token")),
                    "has_id_token": bool(request.data.get("id_token")),
                },
            )
            raise


class LogoutView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"detail": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response({"detail": "Invalid refresh token."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PushDeviceView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = PushDeviceRegisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        device = serializer.save()
        return Response(PushDeviceRegisterSerializer(device).data, status=status.HTTP_201_CREATED)

    def delete(self, request):
        serializer = PushDeviceUnregisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmailVerificationConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        confirm_url = reverse("email-verify-confirm-page")
        query = request.META.get("QUERY_STRING", "")
        if query:
            confirm_url = f"{confirm_url}?{query}"
        return redirect(confirm_url)

    def post(self, request):
        return self._confirm(request.data)

    def _confirm(self, data):
        serializer = EmailVerificationConfirmSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Email confirmat. Te poti autentifica in aplicatie."})


class EmailVerificationRequestView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = EmailVerificationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        debug_token = serializer.save()
        payload = {
            "detail": "Daca exista un cont neconfirmat pentru acest email, am retrimis linkul de confirmare."
        }
        if debug_token:
            payload["debug"] = debug_token
        return Response(payload)


class MeView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def patch(self, request):
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request):
        delete_or_anonymize_user(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetRequestView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        debug_token = serializer.save()
        payload = {
            "detail": "If an active account exists for this email, password reset instructions were sent."
        }
        if debug_token:
            payload["debug"] = debug_token
        return Response(payload)


class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        confirm_url = reverse("password-reset-confirm-page")
        query = request.META.get("QUERY_STRING", "")
        if query:
            confirm_url = f"{confirm_url}?{query}"
        return redirect(confirm_url)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Parola a fost resetată."})
