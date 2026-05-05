import { apiClient } from "./client";
import { mockProducts } from "../data/mockData";
import { Product } from "../types/models";

type Paginated<T> = {
  results: T[];
};

export const productsApi = {
  async list(params?: { search?: string; restaurant?: number; category?: number }) {
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

