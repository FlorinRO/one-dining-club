import { apiClient } from "./client";
import { ENABLE_DEV_MOCK_FALLBACK } from "../config/api";
import { mockCategories, mockProducts, mockRestaurants } from "../data/mockData";
import { Product, ProductCategory, Restaurant, RestaurantCategory } from "../types/models";

type Paginated<T> = {
  next?: string | null;
  results: T[];
};

const unwrap = <T>(payload: T[] | Paginated<T>) => (Array.isArray(payload) ? payload : payload.results);
const mergeById = <T extends { id: number }>(primary: T[], fallback: T[]) => {
  const seen = new Set(primary.map((item) => item.id));
  return [...primary, ...fallback.filter((item) => !seen.has(item.id))];
};
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const toNumber = (value: string | number | null | undefined) => (value == null ? null : Number(value));

const localFilterRestaurants = (
  restaurants: Restaurant[],
  params?: {
    search?: string;
    city?: string;
    category?: number;
    categories?: string;
    category_name?: string;
    min_rating?: number;
    max_delivery_fee?: number;
    max_delivery_time?: number;
    max_distance_km?: number;
    lat?: number;
    lng?: number;
    has_offer?: boolean;
    supports_pickup?: boolean;
    ordering?: string;
  },
) => {
  if (!params) return restaurants;
  const categoryNames = params.category_name
    ? params.category_name.split(",").map((item) => normalize(item.trim())).filter(Boolean)
    : [];
  const categoryIds = params.categories
    ? params.categories
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item))
    : [];

  const filtered = restaurants.filter((restaurant) => {
    const categoryList = restaurant.categories ?? [];
    const categoryNameList = categoryList.map((item) => normalize(item.name));
    const haystack = normalize([restaurant.name, restaurant.description, restaurant.city, categoryList.map((item) => item.name).join(" ")].join(" "));
    const maxDeliveryTime = Math.max(restaurant.estimated_delivery_time_min, restaurant.estimated_delivery_time_max);

    if (params.search && !haystack.includes(normalize(params.search))) return false;
    if (params.city && normalize(restaurant.city) !== normalize(params.city)) return false;
    if (params.category != null && !categoryList.some((item) => item.id === params.category)) return false;
    if (categoryIds.length && !categoryList.some((item) => categoryIds.includes(item.id))) return false;
    if (categoryNames.length && !categoryNames.some((name) => categoryNameList.includes(name))) return false;
    if (params.min_rating != null && (toNumber(restaurant.rating) ?? 0) < params.min_rating) return false;
    if (params.max_delivery_fee != null && (toNumber(restaurant.delivery_fee) ?? 0) > params.max_delivery_fee) return false;
    if (params.max_delivery_time != null && maxDeliveryTime > params.max_delivery_time) return false;
    if (params.max_distance_km != null && (restaurant.distance_km ?? Number.POSITIVE_INFINITY) > params.max_distance_km) return false;
    if (params.has_offer != null && Boolean(restaurant.has_offer) !== params.has_offer) return false;
    if (params.supports_pickup != null && Boolean(restaurant.supports_pickup) !== params.supports_pickup) return false;

    return true;
  });

  if (!params.ordering) return filtered;
  const ordering = params.ordering.trim();
  const isDesc = ordering.startsWith("-");
  const field = isDesc ? ordering.slice(1) : ordering;
  const direction = isDesc ? -1 : 1;

  const sorted = [...filtered].sort((a, b) => {
    if (field === "rating") return ((toNumber(a.rating) ?? 0) - (toNumber(b.rating) ?? 0)) * direction;
    if (field === "delivery_fee") return ((toNumber(a.delivery_fee) ?? 0) - (toNumber(b.delivery_fee) ?? 0)) * direction;
    if (field === "estimated_delivery_time_min") return (a.estimated_delivery_time_min - b.estimated_delivery_time_min) * direction;
    if (field === "distance_km") return ((a.distance_km ?? 999) - (b.distance_km ?? 999)) * direction;
    return 0;
  });

  return sorted;
};

export const restaurantsApi = {
  async list(params?: {
    search?: string;
    city?: string;
    category?: number;
    categories?: string;
    category_name?: string;
    min_rating?: number;
    max_delivery_fee?: number;
    max_delivery_time?: number;
    max_distance_km?: number;
    lat?: number;
    lng?: number;
    has_offer?: boolean;
    supports_pickup?: boolean;
    ordering?: string;
  }) {
    try {
      const { data } = await apiClient.get<Restaurant[] | Paginated<Restaurant>>("/restaurants/", { params });
      const items = unwrap(data);
      if (ENABLE_DEV_MOCK_FALLBACK && items.length <= 1) {
        return mergeById(items, localFilterRestaurants(mockRestaurants, params));
      }
      return items;
    } catch {
      if (!ENABLE_DEV_MOCK_FALLBACK) {
        throw new Error("Nu am putut încărca restaurantele.");
      }
      return localFilterRestaurants(mockRestaurants, params);
    }
  },

  async detail(id: number) {
    try {
      const { data } = await apiClient.get<Restaurant>(`/restaurants/${id}/`);
      return data;
    } catch {
      if (!ENABLE_DEV_MOCK_FALLBACK) {
        throw new Error("Nu am putut încărca restaurantul.");
      }
      return mockRestaurants.find((restaurant) => restaurant.id === id) ?? mockRestaurants[0];
    }
  },

  async products(id: number) {
    try {
      const { data } = await apiClient.get<Product[] | Paginated<Product>>(`/restaurants/${id}/products/`, {
        params: { page_size: 100 },
      });
      if (Array.isArray(data)) return data;

      const items = [...data.results];
      let nextUrl = data.next;
      while (nextUrl) {
        const nextResponse = await apiClient.get<Product[] | Paginated<Product>>(nextUrl);
        const nextData = nextResponse.data;
        if (Array.isArray(nextData)) {
          items.push(...nextData);
          break;
        }
        items.push(...nextData.results);
        nextUrl = nextData.next;
      }

      if (ENABLE_DEV_MOCK_FALLBACK && items.length === 0) {
        return mockProducts.filter((product) => product.restaurant === id);
      }
      return items;
    } catch {
      if (!ENABLE_DEV_MOCK_FALLBACK) {
        throw new Error("Nu am putut încărca produsele restaurantului.");
      }
      return mockProducts.filter((product) => product.restaurant === id);
    }
  },

  async categories(id: number) {
    try {
      const { data } = await apiClient.get<ProductCategory[]>(`/restaurants/${id}/categories/`);
      return data;
    } catch {
      if (!ENABLE_DEV_MOCK_FALLBACK) {
        throw new Error("Nu am putut încărca categoriile restaurantului.");
      }
      return mockCategories.filter((category) => category.restaurant === id);
    }
  },

  async restaurantCategories() {
    const { data } = await apiClient.get<RestaurantCategory[] | Paginated<RestaurantCategory>>("/restaurant-categories/");
    return unwrap(data);
  },
};
