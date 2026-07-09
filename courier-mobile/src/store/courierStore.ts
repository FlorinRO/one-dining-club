import * as Location from "expo-location";
import { create } from "zustand";

import { authApi } from "../api/authApi";
import { courierApi } from "../api/courierApi";
import { getErrorMessage } from "../lib/errors";
import {
  isCourierBackgroundTrackingActive,
  startCourierBackgroundTracking,
  stopCourierBackgroundTracking,
} from "../lib/locationTracking";
import { CourierOperationsSummary, CourierOrder, CourierProfile } from "../types/models";
import { useAuthStore } from "./authStore";

type CourierStore = {
  profile: CourierProfile | null;
  operationsSummary: CourierOperationsSummary | null;
  orders: CourierOrder[];
  bootstrapping: boolean;
  ordersLoading: boolean;
  operationsLoading: boolean;
  profileLoading: boolean;
  trackingActive: boolean;
  error: string | null;
  hydrateCourierSession: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshOperationsSummary: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshTrackingStatus: () => Promise<void>;
  refreshAll: () => Promise<void>;
  acceptOrder: (orderId: number) => Promise<void>;
  advanceOrderStatus: (orderId: number, orderStatus: "picked_up" | "on_the_way" | "delivered") => Promise<void>;
  setAvailability: (isAvailable: boolean) => Promise<void>;
  syncCurrentLocation: () => Promise<{ ok: boolean; message: string }>;
  reset: () => void;
};

function sortOrders(orders: CourierOrder[]) {
  return [...orders].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();
    return rightTime - leftTime;
  });
}

function replaceOrder(orders: CourierOrder[], order: CourierOrder) {
  const next = orders.filter((candidate) => candidate.id !== order.id);
  next.push(order);
  return sortOrders(next);
}

export const useCourierStore = create<CourierStore>((set, get) => ({
  profile: null,
  operationsSummary: null,
  orders: [],
  bootstrapping: false,
  ordersLoading: false,
  operationsLoading: false,
  profileLoading: false,
  trackingActive: false,
  error: null,
  async hydrateCourierSession() {
    set({ bootstrapping: true, error: null });
    try {
      const user = await authApi.me();
      if (user.role !== "courier") {
        throw new Error("This account is not allowed in YUMZY Courier.");
      }
      useAuthStore.getState().setUser(user);
      const [profile, orders, operationsSummary] = await Promise.all([
        courierApi.getProfile(),
        courierApi.listOrders(),
        courierApi.getOperationsSummary(),
      ]);
      const trackingActive = await isCourierBackgroundTrackingActive();
      if (profile.is_available && !trackingActive) {
        void startCourierBackgroundTracking()
          .then(() => get().refreshTrackingStatus())
          .catch(() => undefined);
      }
      if (!profile.is_available && trackingActive) {
        void stopCourierBackgroundTracking()
          .then(() => get().refreshTrackingStatus())
          .catch(() => undefined);
      }
      set({
        profile,
        operationsSummary,
        orders: sortOrders(orders),
        trackingActive,
        bootstrapping: false,
        error: null,
      });
    } catch (error) {
      useAuthStore.getState().logout();
      set({
        profile: null,
        operationsSummary: null,
        orders: [],
        bootstrapping: false,
        trackingActive: false,
        error: getErrorMessage(error, error instanceof Error ? error.message : "Could not load courier session."),
      });
      throw error;
    }
  },
  async refreshOrders() {
    set({ ordersLoading: true, error: null });
    try {
      const orders = await courierApi.listOrders();
      set({ orders: sortOrders(orders), ordersLoading: false });
    } catch (error) {
      set({ ordersLoading: false, error: getErrorMessage(error, "Could not refresh orders.") });
      throw error;
    }
  },
  async refreshOperationsSummary() {
    set({ operationsLoading: true, error: null });
    try {
      const operationsSummary = await courierApi.getOperationsSummary();
      set({ operationsSummary, operationsLoading: false });
    } catch (error) {
      set({ operationsLoading: false, error: getErrorMessage(error, "Could not refresh courier operations.") });
      throw error;
    }
  },
  async refreshProfile() {
    set({ profileLoading: true, error: null });
    try {
      const profile = await courierApi.getProfile();
      set({ profile, profileLoading: false });
    } catch (error) {
      set({ profileLoading: false, error: getErrorMessage(error, "Could not refresh courier profile.") });
      throw error;
    }
  },
  async refreshTrackingStatus() {
    const trackingActive = await isCourierBackgroundTrackingActive();
    set({ trackingActive });
  },
  async refreshAll() {
    await Promise.all([get().refreshProfile(), get().refreshOrders(), get().refreshOperationsSummary(), get().refreshTrackingStatus()]);
  },
  async acceptOrder(orderId) {
    const order = await courierApi.acceptOrder(orderId);
    set((state) => ({ orders: replaceOrder(state.orders, order) }));
    void get().refreshOperationsSummary().catch(() => undefined);
  },
  async advanceOrderStatus(orderId, orderStatus) {
    const order = await courierApi.updateOrderStatus(orderId, orderStatus);
    set((state) => ({ orders: replaceOrder(state.orders, order) }));
    void get().refreshOperationsSummary().catch(() => undefined);
  },
  async setAvailability(isAvailable) {
    const profile = await courierApi.updateProfile({ is_available: isAvailable });
    set({ profile });

    if (isAvailable) {
      try {
        await get().syncCurrentLocation();
      } catch {
        // Keep availability responsive even if foreground location sync fails.
      }

      try {
        await startCourierBackgroundTracking();
      } catch {
        // The app remains usable even if background tracking permission is denied.
      }
    } else {
      try {
        await stopCourierBackgroundTracking();
      } catch {
        // Ignore background tracking stop failures and keep session responsive.
      }
    }

    await get().refreshTrackingStatus();
    void get().refreshOperationsSummary().catch(() => undefined);
  },
  async syncCurrentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      return { ok: false, message: "Location permission is required to update your live position." };
    }

    const currentPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const existingProfile = get().profile;
    const profile = await courierApi.updateProfile({
      current_latitude: currentPosition.coords.latitude.toFixed(6),
      current_longitude: currentPosition.coords.longitude.toFixed(6),
      is_available: existingProfile?.is_available,
    });
    set({ profile });
    return { ok: true, message: "Live location updated." };
  },
  reset() {
    set({
      profile: null,
      operationsSummary: null,
      orders: [],
      bootstrapping: false,
      ordersLoading: false,
      operationsLoading: false,
      profileLoading: false,
      trackingActive: false,
      error: null,
    });
    void stopCourierBackgroundTracking().catch(() => undefined);
  },
}));
