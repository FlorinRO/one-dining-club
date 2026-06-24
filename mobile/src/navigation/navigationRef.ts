import { createNavigationContainerRef } from "@react-navigation/native";

import { ordersApi } from "../api/ordersApi";
import { useAuthStore } from "../store/authStore";
import { RootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingOrderId: number | null = null;
let isOpeningOrder = false;

export function flushPendingNotificationNavigation() {
  if (pendingOrderId) {
    void openOrderFromNotification(pendingOrderId);
  }
}

export async function openOrderFromNotification(orderId: number) {
  pendingOrderId = orderId;

  if (!navigationRef.isReady() || !useAuthStore.getState().accessToken || isOpeningOrder) {
    return;
  }

  const nextOrderId = pendingOrderId;
  pendingOrderId = null;
  isOpeningOrder = true;

  try {
    const order = await ordersApi.detail(nextOrderId);
    if (!navigationRef.isReady()) {
      pendingOrderId = nextOrderId;
      return;
    }

    navigationRef.navigate("MainTabs", {
      screen: "OrdersTab",
      params: {
        screen: "OrderDetails",
        params: { order },
      },
    });
  } catch {
    if (navigationRef.isReady()) {
      navigationRef.navigate("MainTabs", {
        screen: "OrdersTab",
        params: { screen: "OrdersHome" },
      });
    }
  } finally {
    isOpeningOrder = false;
  }
}
