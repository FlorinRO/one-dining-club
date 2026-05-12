import { apiClient } from "./client";
import { mockProducts } from "../data/mockData";
import { Product } from "../types/models";

type Paginated<T> = {
  results: T[];
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
    category_name?: string;
    restaurant_city?: string;
    exclude_allergens?: string;
    ordering?: string;
  }) {
    try {
      const { data } = await apiClient.get<Product[] | Paginated<Product>>("/products/", { params });
      return Array.isArray(data) ? data : data.results;
    } catch {
      return mockProducts;
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
};
