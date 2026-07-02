import { createNavigationContainerRef } from "@react-navigation/native";

import { useAuthStore } from "../store/authStore";
import { RootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingOrderId: number | null = null;

export function flushPendingNotificationNavigation() {
  if (pendingOrderId) {
    openOrderFromNotification(pendingOrderId);
  }
}

export function openOrderFromNotification(orderId: number) {
  pendingOrderId = orderId;

  if (!navigationRef.isReady() || !useAuthStore.getState().accessToken) {
    return;
  }

  const nextOrderId = pendingOrderId;
  pendingOrderId = null;
  navigationRef.navigate("OrderDetails", { orderId: nextOrderId });
}
