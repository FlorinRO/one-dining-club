import { apiClient } from "./client";
import { CreateOrderPayload } from "./ordersApi";
import { Order, PaymentMethod } from "../types/models";

export type CheckoutResponse = {
  order: Order;
  payment_sheet?: {
    payment_intent_client_secret: string;
    payment_intent_id: string;
    merchant_display_name: string;
    merchant_country_code: string;
    currency_code: string;
    payment_method: PaymentMethod;
  };
};

export const paymentsApi = {
  async checkout(payload: CreateOrderPayload) {
    const { data } = await apiClient.post<CheckoutResponse>("/payments/checkout/", payload);
    return data;
  },
};
