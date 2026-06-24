import Constants from "expo-constants";

type ExpoExtra = {
  stripePublishableKey?: string;
  stripeMerchantIdentifier?: string;
  stripeMerchantCountryCode?: string;
  stripeCurrencyCode?: string;
  stripeMerchantDisplayName?: string;
  stripeReturnUrl?: string;
};

function readExpoExtra(): ExpoExtra {
  return (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
}

function normalizeString(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

const extra = readExpoExtra();

export const STRIPE_PUBLISHABLE_KEY = normalizeString(
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? extra.stripePublishableKey,
  "",
);
export const STRIPE_MERCHANT_IDENTIFIER = normalizeString(
  process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER ?? extra.stripeMerchantIdentifier,
  "merchant.com.onediningclub",
);
export const STRIPE_MERCHANT_COUNTRY_CODE = normalizeString(
  process.env.EXPO_PUBLIC_STRIPE_MERCHANT_COUNTRY_CODE ?? extra.stripeMerchantCountryCode,
  "RO",
).toUpperCase();
export const STRIPE_CURRENCY_CODE = normalizeString(
  process.env.EXPO_PUBLIC_STRIPE_CURRENCY_CODE ?? extra.stripeCurrencyCode,
  "RON",
).toUpperCase();
export const STRIPE_MERCHANT_DISPLAY_NAME = normalizeString(
  process.env.EXPO_PUBLIC_STRIPE_MERCHANT_DISPLAY_NAME ?? extra.stripeMerchantDisplayName,
  "YUMZY",
);
export const STRIPE_RETURN_URL = normalizeString(
  process.env.EXPO_PUBLIC_STRIPE_RETURN_URL ?? extra.stripeReturnUrl,
  "onediningclub://stripe-redirect",
);

export function isStripeConfigured() {
  return Boolean(STRIPE_PUBLISHABLE_KEY && !STRIPE_PUBLISHABLE_KEY.includes("replace_me"));
}
