import { createNavigationContainerRef } from "@react-navigation/native";

import { ordersApi } from "../api/ordersApi";
import { productsApi } from "../api/productsApi";
import { restaurantsApi } from "../api/restaurantsApi";
import { useAuthStore } from "../store/authStore";
import { RootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingOrderId: number | null = null;
let isOpeningOrder = false;
let pendingSharedProductId: number | null = null;
let isOpeningSharedProduct = false;

export function flushPendingNotificationNavigation() {
  if (pendingOrderId) {
    void openOrderFromNotification(pendingOrderId);
  }
  if (pendingSharedProductId) {
    void openProductFromLink(pendingSharedProductId);
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

export async function openProductFromLink(productId: number) {
  pendingSharedProductId = productId;

  const { accessToken, isGuest } = useAuthStore.getState();
  if (!navigationRef.isReady() || (!accessToken && !isGuest) || isOpeningSharedProduct) {
    return;
  }

  const nextProductId = pendingSharedProductId;
  pendingSharedProductId = null;
  isOpeningSharedProduct = true;

  try {
    const product = await productsApi.detail(nextProductId);
    const restaurant = await restaurantsApi.detail(Number(product.restaurant));

    if (!navigationRef.isReady()) {
      pendingSharedProductId = nextProductId;
      return;
    }

    navigationRef.navigate("MainTabs", {
      screen: "HomeTab",
      params: {
        screen: "ProductDetails",
        params: { restaurant, product },
      },
    });
  } catch {
    if (navigationRef.isReady()) {
      navigationRef.navigate("MainTabs", {
        screen: "HomeTab",
        params: { screen: "Home" },
      });
    }
  } finally {
    isOpeningSharedProduct = false;
  }
}
