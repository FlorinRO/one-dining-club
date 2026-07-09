import { apiClient } from "./client";
import {
  CourierDocument,
  CourierHelpCenter,
  CourierOperationEntry,
  CourierOperationsSummary,
  CourierOrder,
  CourierProfile,
  CourierSupportTicket,
  OrderStatus,
} from "../types/models";

type OrderListResponse = CourierOrder[] | { results: CourierOrder[] };
type ListResponse<T> = T[] | { results: T[] };

function normalizeOrderList(data: OrderListResponse) {
  return Array.isArray(data) ? data : data.results;
}

function normalizeList<T>(data: ListResponse<T>) {
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

  async getOperationsSummary() {
    const { data } = await apiClient.get<CourierOperationsSummary>("/courier/operations/");
    return data;
  },

  async listDocuments() {
    const { data } = await apiClient.get<ListResponse<CourierDocument>>("/courier/documents/");
    return normalizeList(data);
  },

  async submitDocument(payload: {
    document_type: CourierDocument["document_type"];
    file_name?: string;
    expires_at?: string | null;
  }) {
    const { data } = await apiClient.post<CourierDocument>("/courier/documents/", payload);
    return data;
  },

  async getHelpCenter() {
    const { data } = await apiClient.get<CourierHelpCenter>("/courier/help/");
    return data;
  },

  async listSupportTickets() {
    const { data } = await apiClient.get<ListResponse<CourierSupportTicket>>("/courier/support/");
    return normalizeList(data);
  },

  async createSupportTicket(payload: { subject: string; message: string }) {
    const { data } = await apiClient.post<CourierSupportTicket>("/courier/support/", payload);
    return data;
  },

  async recordSimulatedDelivery(payload: {
    reference_id: string;
    delivery_fee: string | number;
    distance_km: string | number;
    duration_minutes?: number | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data } = await apiClient.post<CourierOperationEntry>("/courier/operations/", payload);
    return data;
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
