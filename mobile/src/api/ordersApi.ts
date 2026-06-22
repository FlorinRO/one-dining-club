import { apiClient } from "./client";
import { Order, PaymentMethod, Review } from "../types/models";

export type CreateOrderPayload = {
  restaurant_id: number;
  address_id?: number;
  fulfillment_type?: "delivery" | "pickup";
  payment_method: PaymentMethod;
  customer_note?: string;
  promo_code?: string;
  items: Array<{
    product_id: number;
    quantity: number;
    notes?: string;
    option_ids?: number[];
  }>;
};

export const ordersApi = {
  async list() {
    const { data } = await apiClient.get<Order[] | { results: Order[] }>("/orders/");
    return Array.isArray(data) ? data : data.results;
  },

  async detail(id: number) {
    const { data } = await apiClient.get<Order>(`/orders/${id}/`);
    return data;
  },

  async create(payload: CreateOrderPayload) {
    const { data } = await apiClient.post<Order>("/orders/", payload);
    return data;
  },

  async cancel(id: number) {
    const { data } = await apiClient.patch<Order>(`/orders/${id}/cancel/`);
    return data;
  },

  async review(id: number, payload: { rating: number; comment?: string }) {
    const { data } = await apiClient.post<Review>(`/orders/${id}/review/`, payload);
    return data;
  },
};
