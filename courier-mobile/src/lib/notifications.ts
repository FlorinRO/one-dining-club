import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { currentPushPlatform, notificationsApi } from "../api/notificationsApi";
import { openOrderFromNotification } from "../navigation/navigationRef";
import { useAuthStore } from "../store/authStore";

const INSTALLATION_ID_STORAGE_KEY = "yumzy-courier:push:installation-id";
const EXPO_PUSH_TOKEN_STORAGE_KEY = "yumzy-courier:push:expo-token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotificationSetup() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (Platform.OS === "android") {
      void setupAndroidNotificationChannels();
    }
  }, []);

  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          handleNotificationResponse(response);
        }
      })
      .catch(() => null);

    return () => {
      responseSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated || !accessToken) {
      return;
    }

    void registerCurrentPushDevice().catch(() => null);
  }, [accessToken, hasHydrated]);
}

export async function unregisterCurrentPushDevice() {
  const [expoPushToken, installationId] = await Promise.all([
    AsyncStorage.getItem(EXPO_PUSH_TOKEN_STORAGE_KEY),
    AsyncStorage.getItem(INSTALLATION_ID_STORAGE_KEY),
  ]);

  if (!expoPushToken && !installationId) {
    return;
  }

  try {
    await notificationsApi.unregisterDevice({
      expo_push_token: expoPushToken ?? undefined,
      device_id: installationId ?? undefined,
    });
  } catch {
    // Push cleanup should never block logout.
  } finally {
    await AsyncStorage.removeItem(EXPO_PUSH_TOKEN_STORAGE_KEY);
  }
}

async function registerCurrentPushDevice() {
  const expoPushToken = await getExpoPushToken();
  if (!expoPushToken) {
    return;
  }

  const installationId = await getOrCreateInstallationId();
  await notificationsApi.registerDevice({
    expo_push_token: expoPushToken,
    platform: currentPushPlatform(),
    device_id: installationId,
    app_version: Constants.expoConfig?.version ?? "",
  });
  await AsyncStorage.setItem(EXPO_PUSH_TOKEN_STORAGE_KEY, expoPushToken);
}

async function getExpoPushToken() {
  const permission = await Notifications.getPermissionsAsync();
  let finalStatus = permission.status;

  if (finalStatus !== "granted") {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = readExpoProjectId();
  if (!projectId) {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

async function setupAndroidNotificationChannels() {
  await Notifications.setNotificationChannelAsync("orders", {
    name: "Orders",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
  });

  await Notifications.setNotificationChannelAsync("operations", {
    name: "Operations",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const orderId = readOrderIdFromNotificationData(response.notification.request.content.data);
  if (orderId) {
    openOrderFromNotification(orderId);
  }
}

function readOrderIdFromNotificationData(data: Notifications.NotificationContent["data"]) {
  const payload = data as Record<string, unknown> | undefined;
  const rawOrderId = payload?.order_id ?? payload?.orderId;
  const parsedOrderId = typeof rawOrderId === "number" ? rawOrderId : Number(rawOrderId);
  return Number.isInteger(parsedOrderId) && parsedOrderId > 0 ? parsedOrderId : null;
}

function readExpoProjectId() {
  const constantsWithEas = Constants as typeof Constants & { easConfig?: { projectId?: string } };
  return Constants.expoConfig?.extra?.eas?.projectId ?? constantsWithEas.easConfig?.projectId ?? null;
}

async function getOrCreateInstallationId() {
  const existingId = await AsyncStorage.getItem(INSTALLATION_ID_STORAGE_KEY);
  if (existingId) {
    return existingId;
  }

  const nextId = `yumzy-courier-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(INSTALLATION_ID_STORAGE_KEY, nextId);
  return nextId;
}
