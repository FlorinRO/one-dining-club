import { apiClient } from "./client";
import { mockCategories, mockProducts, mockRestaurants } from "../data/mockData";
import { Product, ProductCategory, Restaurant } from "../types/models";

type Paginated<T> = {
  results: T[];
};

const unwrap = <T>(payload: T[] | Paginated<T>) => (Array.isArray(payload) ? payload : payload.results);

export const restaurantsApi = {
  async list(params?: { search?: string; city?: string }) {
    try {
      const { data } = await apiClient.get<Restaurant[] | Paginated<Restaurant>>("/restaurants/", { params });
      return unwrap(data);
    } catch {
      return mockRestaurants;
    }
  },

  async detail(id: number) {
    try {
      const { data } = await apiClient.get<Restaurant>(`/restaurants/${id}/`);
      return data;
    } catch {
      return mockRestaurants.find((restaurant) => restaurant.id === id) ?? mockRestaurants[0];
    }
  },

  async products(id: number) {
    try {
      const { data } = await apiClient.get<Product[] | Paginated<Product>>(`/restaurants/${id}/products/`);
      return unwrap(data);
    } catch {
      return mockProducts.filter((product) => product.restaurant === id);
    }
  },

  async categories(id: number) {
    try {
      const { data } = await apiClient.get<ProductCategory[]>(`/restaurants/${id}/categories/`);
      return data;
    } catch {
      return mockCategories.filter((category) => category.restaurant === id);
    }
  },
};

