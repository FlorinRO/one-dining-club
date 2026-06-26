import { apiClient } from "./client";
import { mockProducts, mockRestaurants } from "../data/mockData";
import { Product, ProductComment, ProductCommentLikeSummary, ProductSocialSummary } from "../types/models";

type Paginated<T> = {
  results: T[];
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toNumber = (value: string | number | null | undefined) => (value == null ? null : Number(value));

const mergeById = <T extends { id: number }>(primary: T[], fallback: T[]) => {
  const seen = new Set(primary.map((item) => item.id));
  return [...primary, ...fallback.filter((item) => !seen.has(item.id))];
};

const localFilterProducts = (
  products: Product[],
  params?: {
    search?: string;
    restaurant?: number;
    category?: number;
    is_available?: boolean;
    is_popular?: boolean;
    min_price?: number;
    max_price?: number;
    has_discount?: boolean;
    max_preparation_time?: number;
    product_type?: string;
    category_name?: string;
    restaurant_city?: string;
    exclude_allergens?: string;
    ordering?: string;
  },
) => {
  if (!params) return products;
  const restaurantCityById = new Map(mockRestaurants.map((item) => [item.id, normalize(item.city)]));

  const categoryNames = params.category_name
    ? params.category_name.split(",").map((item) => normalize(item.trim())).filter(Boolean)
    : [];
  const excludedAllergens = params.exclude_allergens
    ? params.exclude_allergens.split(",").map((item) => normalize(item.trim())).filter(Boolean)
    : [];

  const filtered = products.filter((product) => {
    const effectivePrice = toNumber(product.effective_price ?? product.discount_price ?? product.price) ?? 0;
    const haystack = normalize(
      [product.name, product.description, product.restaurant_name ?? "", product.allergens ?? "", product.category_name ?? "", product.product_type_label ?? ""].join(" "),
    );
    const productAllergens = normalize(product.allergens ?? "");

    if (params.search && !haystack.includes(normalize(params.search))) return false;
    if (params.restaurant != null && product.restaurant !== params.restaurant) return false;
    if (params.category != null && product.category !== params.category) return false;
    if (params.is_available != null && product.is_available !== params.is_available) return false;
    if (params.is_popular != null && product.is_popular !== params.is_popular) return false;
    if (params.min_price != null && effectivePrice < params.min_price) return false;
    if (params.max_price != null && effectivePrice > params.max_price) return false;
    if (
      params.has_discount != null &&
      ((product.discount_price != null && toNumber(product.discount_price) !== toNumber(product.price)) !== params.has_discount)
    ) {
      return false;
    }
    if (params.max_preparation_time != null && product.preparation_time > params.max_preparation_time) return false;
    if (params.product_type && normalize(product.product_type ?? "") !== normalize(params.product_type)) return false;
    if (categoryNames.length && !categoryNames.includes(normalize(product.category_name ?? ""))) return false;
    if (params.restaurant_city && restaurantCityById.get(product.restaurant) !== normalize(params.restaurant_city)) return false;
    if (excludedAllergens.length && excludedAllergens.some((item) => productAllergens.includes(item))) return false;

    return true;
  });

  if (!params.ordering) return filtered;

  const ordering = params.ordering.trim();
  const isDesc = ordering.startsWith("-");
  const field = isDesc ? ordering.slice(1) : ordering;
  const direction = isDesc ? -1 : 1;

  const sorted = [...filtered].sort((a, b) => {
    if (field === "price" || field === "effective_price") {
      return ((toNumber(a.effective_price ?? a.discount_price ?? a.price) ?? 0) - (toNumber(b.effective_price ?? b.discount_price ?? b.price) ?? 0)) * direction;
    }
    if (field === "preparation_time") return (a.preparation_time - b.preparation_time) * direction;
    if (field === "name") return a.name.localeCompare(b.name) * direction;
    return 0;
  });

  return sorted;
};

export const productsApi = {
  async list(params?: {
    search?: string;
    restaurant?: number;
    category?: number;
    is_available?: boolean;
    is_popular?: boolean;
    min_price?: number;
    max_price?: number;
    has_discount?: boolean;
    max_preparation_time?: number;
    product_type?: string;
    category_name?: string;
    restaurant_city?: string;
    exclude_allergens?: string;
    ordering?: string;
  }) {
    try {
      const { data } = await apiClient.get<Product[] | Paginated<Product>>("/products/", { params });
      const items = Array.isArray(data) ? data : data.results;
      if (__DEV__ && items.length <= 2) {
        return mergeById(items, localFilterProducts(mockProducts, params));
      }
      return items;
    } catch {
      return localFilterProducts(mockProducts, params);
    }
  },

  async detail(id: number) {
    try {
      const { data } = await apiClient.get<Product>(`/products/${id}/`);
      return data;
    } catch {
      return mockProducts.find((product) => product.id === id) ?? mockProducts[0];
    }
  },

  async toggleLike(id: number) {
    const { data } = await apiClient.post<ProductSocialSummary>(`/products/${id}/like/`);
    return data;
  },

  async comments(id: number) {
    const { data } = await apiClient.get<ProductComment[] | Paginated<ProductComment>>(`/products/${id}/comments/`);
    return Array.isArray(data) ? data : data.results;
  },

  async addComment(id: number, payload: { text: string; parent?: number | null; photo_urls?: string[] }) {
    const { data } = await apiClient.post<ProductComment>(`/products/${id}/comments/`, payload);
    return data;
  },

  async toggleCommentLike(id: number) {
    const { data } = await apiClient.post<ProductCommentLikeSummary>(`/product-comments/${id}/like/`);
    return data;
  },
};
