import * as Facebook from "expo-auth-session/providers/facebook";
import * as Google from "expo-auth-session/providers/google";
import { ResponseType } from "expo-auth-session";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";

import { AuthResponse, authApi } from "../api/authApi";

WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = "google" | "facebook";

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

export function useSocialAuth({ onSuccess, onError }: UseSocialAuthOptions) {
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);

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
    if (googleResponse?.type !== "success") {
      return;
    }

    const idToken = googleResponse.params.id_token;
    const accessToken = googleResponse.params.access_token ?? googleResponse.authentication?.accessToken;
    const token = idToken || accessToken;
    const tokenType = idToken ? "id_token" : "access_token";

    if (!token) {
      setLoadingProvider(null);
      onError("Google nu a returnat un token valid.");
      return;
    }

    authApi
      .socialLogin("google", token, tokenType)
      .then(onSuccess)
      .catch(() => onError("Nu am putut valida contul Google."))
      .finally(() => setLoadingProvider(null));
  }, [googleResponse, onError, onSuccess]);

  useEffect(() => {
    if (facebookResponse?.type !== "success") {
      return;
    }

    const accessToken = facebookResponse.params.access_token ?? facebookResponse.authentication?.accessToken;
    if (!accessToken) {
      setLoadingProvider(null);
      onError("Facebook nu a returnat un token valid.");
      return;
    }

    authApi
      .socialLogin("facebook", accessToken)
      .then(onSuccess)
      .catch(() => onError("Nu am putut valida contul Facebook."))
      .finally(() => setLoadingProvider(null));
  }, [facebookResponse, onError, onSuccess]);

  const startSocialLogin = async (provider: SocialProvider) => {
    if (provider === "google" && (!hasGoogleClient || !googleRequest)) {
      onError("Configurează EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID sau EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID pentru login Google.");
      return;
    }
    if (provider === "facebook" && (!hasFacebookClient || !facebookRequest)) {
      onError("Configurează EXPO_PUBLIC_FACEBOOK_CLIENT_ID pentru login Facebook.");
      return;
    }

    setLoadingProvider(provider);
    const response = provider === "google" ? await promptGoogle() : await promptFacebook();
    if (response.type === "cancel" || response.type === "dismiss") {
      setLoadingProvider(null);
    }
    if (response.type === "error") {
      setLoadingProvider(null);
      onError(`Autentificarea ${provider === "google" ? "Google" : "Facebook"} a eșuat.`);
    }
  };

  return { loadingProvider, startSocialLogin };
}
