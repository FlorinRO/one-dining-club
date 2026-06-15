import * as AppleAuthentication from "expo-apple-authentication";
import * as Facebook from "expo-auth-session/providers/facebook";
import * as Google from "expo-auth-session/providers/google";
import { ResponseType } from "expo-auth-session";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";

import { AuthResponse, authApi } from "../api/authApi";

WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = "google" | "facebook" | "apple";

type AuthExtra = {
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  facebookClientId?: string;
};

type UseSocialAuthOptions = {
  onSuccess: (session: AuthResponse) => void;
  onError: (message: string) => void;
};

const extra = (Constants.expoConfig?.extra ?? {}) as AuthExtra;

function extractApiErrorMessage(error: unknown): string | null {
  if (!(error instanceof AxiosError)) return null;

  const data = error.response?.data;
  if (typeof data === "string" && data.trim()) {
    const trimmed = data.trim();
    if (trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")) {
      return null;
    }
    return trimmed;
  }
  if (!data || typeof data !== "object") return null;

  const values = Object.values(data as Record<string, unknown>);
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) return value[0].trim();
  }

  return null;
}

function extractNativeErrorMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  const parts = [error.message.trim()];
  if ("code" in error && typeof error.code === "string" && error.code.trim()) {
    parts.unshift(error.code.trim());
  }

  const message = parts.filter(Boolean).join(": ").trim();
  return message || null;
}

function isExpoGoRuntime() {
  const runtime = Constants.executionEnvironment;
  return runtime === "storeClient";
}

export function useSocialAuth({ onSuccess, onError }: UseSocialAuthOptions) {
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  const googleConfig = useMemo(
    () => ({
      webClientId: extra.googleWebClientId ?? "",
      iosClientId: extra.googleIosClientId ?? "",
      androidClientId: extra.googleAndroidClientId ?? "",
      scopes: ["openid", "profile", "email"],
      selectAccount: true,
    }),
    [],
  );
  const facebookConfig = useMemo(
    () => ({
      clientId: extra.facebookClientId ?? "",
      responseType: ResponseType.Token,
      scopes: ["public_profile", "email"],
    }),
    [],
  );

  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest(googleConfig, {
    scheme: "onediningclub",
  });
  const [facebookRequest, facebookResponse, promptFacebook] = Facebook.useAuthRequest(facebookConfig, {
    scheme: "onediningclub",
  });

  const hasGoogleClient = Boolean(extra.googleWebClientId || extra.googleIosClientId || extra.googleAndroidClientId);
  const hasFacebookClient = Boolean(extra.facebookClientId);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAuthAvailable)
      .catch(() => setAppleAuthAvailable(false));
  }, []);

  useEffect(() => {
    if (googleResponse?.type !== "success") {
      return;
    }

    const idToken = googleResponse.params.id_token;
    const accessToken = googleResponse.params.access_token ?? googleResponse.authentication?.accessToken;
    const token = idToken || accessToken;
    const tokenType = idToken ? "id_token" : "access_token";

    if (!token) {
      setLoadingProvider(null);
      onError("Google did not return a valid token.");
      return;
    }

    authApi
      .socialLogin("google", token, tokenType)
      .then(onSuccess)
      .catch((error) => onError(extractApiErrorMessage(error) ?? "Could not validate Google account."))
      .finally(() => setLoadingProvider(null));
  }, [googleResponse, onError, onSuccess]);

  useEffect(() => {
    if (facebookResponse?.type !== "success") {
      return;
    }

    const accessToken = facebookResponse.params.access_token ?? facebookResponse.authentication?.accessToken;
    if (!accessToken) {
      setLoadingProvider(null);
      onError("Facebook did not return a valid token.");
      return;
    }

    authApi
      .socialLogin("facebook", accessToken)
      .then(onSuccess)
      .catch((error) => onError(extractApiErrorMessage(error) ?? "Could not validate Facebook account."))
      .finally(() => setLoadingProvider(null));
  }, [facebookResponse, onError, onSuccess]);

  const startSocialLogin = async (provider: SocialProvider) => {
    if (provider === "google" && (!hasGoogleClient || !googleRequest)) {
      onError("Configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, or EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID for Google login.");
      return;
    }
    if (provider === "facebook" && (!hasFacebookClient || !facebookRequest)) {
      onError("Configure EXPO_PUBLIC_FACEBOOK_CLIENT_ID for Facebook login.");
      return;
    }
    if (provider === "apple" && !appleAuthAvailable) {
      if (isExpoGoRuntime()) {
        onError("Apple Sign In must be tested from a native iOS build or TestFlight, not Expo Go.");
        return;
      }
      onError("Apple Sign In is not available on this device.");
      return;
    }

    setLoadingProvider(provider);
    if (provider === "apple") {
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!credential.identityToken) {
          onError("Apple did not return a valid token.");
          return;
        }
        const session = await authApi.socialLogin("apple", credential.identityToken, "id_token");
        onSuccess(session);
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ERR_REQUEST_CANCELED"
        ) {
          return;
        }
        onError(extractApiErrorMessage(error) ?? extractNativeErrorMessage(error) ?? "Apple authentication failed.");
      } finally {
        setLoadingProvider(null);
      }
      return;
    }

    const response = provider === "google" ? await promptGoogle() : await promptFacebook();
    if (response.type === "cancel" || response.type === "dismiss") {
      setLoadingProvider(null);
    }
    if (response.type === "error") {
      setLoadingProvider(null);
      onError(`${provider === "google" ? "Google" : "Facebook"} authentication failed.`);
    }
  };

  return { appleAuthAvailable, loadingProvider, startSocialLogin };
}
