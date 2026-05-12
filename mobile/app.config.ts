import type { ExpoConfig } from "expo/config";

const env = (name: string, fallback?: unknown) => process.env[name] ?? fallback;

function appendFacebookScheme(scheme: ExpoConfig["scheme"], facebookClientId?: string) {
  if (!facebookClientId) return scheme;

  const schemes = Array.isArray(scheme) ? scheme : scheme ? [scheme] : [];
  return Array.from(new Set([...schemes, `fb${facebookClientId}`]));
}

export default ({ config }: { config: ExpoConfig }): ExpoConfig => {
  const facebookClientId = env("EXPO_PUBLIC_FACEBOOK_CLIENT_ID", config.extra?.facebookClientId) as string | undefined;

  return {
    ...config,
    scheme: appendFacebookScheme(config.scheme, facebookClientId),
    extra: {
      ...(config.extra ?? {}),
      apiUrl: env("EXPO_PUBLIC_API_URL", config.extra?.apiUrl),
      productionApiUrl: env("EXPO_PUBLIC_PRODUCTION_API_URL", config.extra?.productionApiUrl),
      googleWebClientId: env("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", config.extra?.googleWebClientId),
      googleIosClientId: env("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID", config.extra?.googleIosClientId),
      googleAndroidClientId: env("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID", config.extra?.googleAndroidClientId),
      facebookClientId,
    },
  };
};
