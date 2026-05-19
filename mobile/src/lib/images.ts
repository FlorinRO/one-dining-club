import { API_ORIGIN } from "../config/api";

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
    return `${API_ORIGIN}${uri}`;
  }

  // Accept relative media paths like "media/products/file.jpg"
  if (uri.startsWith("media/")) {
    return `${API_ORIGIN}/${uri}`;
  }

  return fallback;
}

export function resolveRestaurantImageUri(uri: string | null | undefined, restaurantId?: number) {
  if (uri) return resolveImageUri(uri, FALLBACK_RESTAURANT_IMAGE);
  const seed = restaurantId ?? 1;
  return `${FALLBACK_RESTAURANT_IMAGE}&sig=rest-${seed}`;
}

export function resolveProductImageUri(uri: string | null | undefined, productId?: number) {
  if (uri) return resolveImageUri(uri, FALLBACK_PRODUCT_IMAGE);
  const seed = productId ?? 1;
  return `${FALLBACK_PRODUCT_IMAGE}&sig=prod-${seed}`;
}
