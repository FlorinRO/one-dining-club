import type { ExpoConfig } from "expo/config";

const env = (name: string, fallback?: unknown) => process.env[name] ?? fallback;

function isPlaceholderStripeKey(value: unknown) {
  return typeof value === "string" && value.includes("replace_me");
}

function assertRequiredDistributedGoogleEnv(config: ExpoConfig) {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile !== "preview" && profile !== "production") {
    return;
  }

  const required = [
    ["EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", config.extra?.googleWebClientId],
    ["EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID", config.extra?.googleIosClientId],
  ] as const;

  const missing = required
    .filter(([name, fallback]) => !(process.env[name] ?? fallback))
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(
      `Missing required Google auth env for distributed build profile "${profile}": ${missing.join(", ")}. ` +
        "Set them in the EAS environment before building for internal distribution or TestFlight.",
    );
  }
}

function assertRequiredProductionFacebookEnv(config: ExpoConfig) {
  if (process.env.EAS_BUILD_PROFILE !== "production") {
    return;
  }

  const required = [["EXPO_PUBLIC_FACEBOOK_CLIENT_ID", config.extra?.facebookClientId]] as const;
  const missing = required
    .filter(([name, fallback]) => !(process.env[name] ?? fallback))
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(
      `Missing required Facebook auth env for production build: ${missing.join(", ")}. ` +
        "Set it in the EAS production environment before building for TestFlight/App Store.",
    );
  }
}

function assertRequiredDistributedPaymentEnv(config: ExpoConfig) {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile !== "preview" && profile !== "production") {
    return;
  }

  const required = [
    ["EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY", config.extra?.stripePublishableKey],
    ["EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER", config.extra?.stripeMerchantIdentifier],
  ] as const;

  const missing = required
    .filter(([name, fallback]) => {
      const value = process.env[name] ?? fallback;
      return !value || isPlaceholderStripeKey(value);
    })
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(
      `Missing required Stripe env for distributed build profile "${profile}": ${missing.join(", ")}. ` +
        "Set them in the EAS environment before building for internal distribution or TestFlight.",
    );
  }
}

function appendFacebookScheme(scheme: ExpoConfig["scheme"], facebookClientId?: string) {
  if (!facebookClientId) return scheme;

  const schemes = Array.isArray(scheme) ? scheme : scheme ? [scheme] : [];
  return Array.from(new Set([...schemes, `fb${facebookClientId}`]));
}

export default ({ config }: { config: ExpoConfig }): ExpoConfig => {
  const facebookClientId = env("EXPO_PUBLIC_FACEBOOK_CLIENT_ID", config.extra?.facebookClientId) as string | undefined;
  assertRequiredDistributedGoogleEnv(config);
  assertRequiredProductionFacebookEnv(config);
  assertRequiredDistributedPaymentEnv(config);
  const basePlugins = Array.isArray(config.plugins) ? config.plugins : [];
  const requiredPlugins = ["expo-audio", "expo-apple-authentication"];
  const plugins = requiredPlugins.reduce(
    (acc, plugin) => (acc.includes(plugin) ? acc : [...acc, plugin]),
    basePlugins,
  );

  return {
    ...config,
    plugins,
    ios: {
      ...config.ios,
      usesAppleSignIn: true,
    },
    scheme: appendFacebookScheme(config.scheme, facebookClientId),
    extra: {
      ...(config.extra ?? {}),
      apiUrl: env("EXPO_PUBLIC_API_URL", config.extra?.apiUrl),
      productionApiUrl: env("EXPO_PUBLIC_PRODUCTION_API_URL", config.extra?.productionApiUrl),
      googleWebClientId: env("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", config.extra?.googleWebClientId),
      googleIosClientId: env("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID", config.extra?.googleIosClientId),
      googleAndroidClientId: env("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID", config.extra?.googleAndroidClientId),
      facebookClientId,
      stripePublishableKey: env("EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY", config.extra?.stripePublishableKey),
      stripeMerchantIdentifier: env("EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER", config.extra?.stripeMerchantIdentifier),
      stripeMerchantCountryCode: env("EXPO_PUBLIC_STRIPE_MERCHANT_COUNTRY_CODE", config.extra?.stripeMerchantCountryCode),
      stripeCurrencyCode: env("EXPO_PUBLIC_STRIPE_CURRENCY_CODE", config.extra?.stripeCurrencyCode),
      stripeMerchantDisplayName: env("EXPO_PUBLIC_STRIPE_MERCHANT_DISPLAY_NAME", config.extra?.stripeMerchantDisplayName),
      stripeReturnUrl: env("EXPO_PUBLIC_STRIPE_RETURN_URL", config.extra?.stripeReturnUrl),
    },
  };
};
