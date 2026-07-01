import { apiClient } from "./client";
import { CourierOrder, CourierProfile, OrderStatus } from "../types/models";

type OrderListResponse = CourierOrder[] | { results: CourierOrder[] };

function normalizeOrderList(data: OrderListResponse) {
  return Array.isArray(data) ? data : data.results;
}

export const courierApi = {
  async getProfile() {
    const { data } = await apiClient.get<CourierProfile>("/courier/location/");
    return data;
  },

  async updateProfile(payload: Partial<CourierProfile>) {
    const { data } = await apiClient.patch<CourierProfile>("/courier/location/", payload);
    return data;
  },

  async listOrders() {
    const { data } = await apiClient.get<OrderListResponse>("/courier/orders/");
    return normalizeOrderList(data);
  },

  async getOrder(orderId: number) {
    const { data } = await apiClient.get<CourierOrder>(`/courier/orders/${orderId}/`);
    return data;
  },

  async acceptOrder(orderId: number) {
    const { data } = await apiClient.patch<CourierOrder>(`/courier/orders/${orderId}/accept/`);
    return data;
  },

  async updateOrderStatus(orderId: number, orderStatus: Extract<OrderStatus, "picked_up" | "on_the_way" | "delivered">) {
    const { data } = await apiClient.patch<CourierOrder>(`/courier/orders/${orderId}/status/`, {
      order_status: orderStatus,
    });
    return data;
  },
};
