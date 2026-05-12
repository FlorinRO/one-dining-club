from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from users.serializers import (
    EmailVerificationConfirmSerializer,
    EmailVerificationRequestSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    SocialLoginSerializer,
    UserSerializer,
)


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


class LoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class SocialLoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = SocialLoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


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


class EmailVerificationConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        return self._confirm(request.query_params)

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

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password has been reset."})
