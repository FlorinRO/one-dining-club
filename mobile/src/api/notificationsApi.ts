import { Platform } from "react-native";

import { apiClient } from "./client";

type PushPlatform = "ios" | "android" | "web" | "unknown";

export type RegisterPushDevicePayload = {
  expo_push_token: string;
  platform: PushPlatform;
  device_id?: string;
  app_version?: string;
};

export type UnregisterPushDevicePayload = {
  expo_push_token?: string;
  device_id?: string;
};

export function currentPushPlatform(): PushPlatform {
  if (Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web") {
    return Platform.OS;
  }
  return "unknown";
}

export const notificationsApi = {
  async registerDevice(payload: RegisterPushDevicePayload) {
    const { data } = await apiClient.post("/push/devices/", payload);
    return data;
  },

  async unregisterDevice(payload: UnregisterPushDevicePayload) {
    await apiClient.delete("/push/devices/", { data: payload });
  },
};
