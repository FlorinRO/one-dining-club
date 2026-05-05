import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? extra?.apiUrl ?? "http://127.0.0.1:8000/api";
const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, "");

export const FALLBACK_RESTAURANT_IMAGE =
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?q=80&w=1400&auto=format&fit=crop";
export const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop";
export const FALLBACK_HERO_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1400&auto=format&fit=crop";

export function resolveImageUri(uri: string | null | undefined, fallback: string) {
  if (!uri) return fallback;

  // URLs locale din backend nu sunt accesibile pe telefon fizic
  if (uri.includes("127.0.0.1") || uri.includes("localhost")) {
    return fallback;
  }

  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  if (uri.startsWith("/")) {
    return `${apiOrigin}${uri}`;
  }

  return fallback;
}
