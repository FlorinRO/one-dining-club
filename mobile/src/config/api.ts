import Constants from "expo-constants";

const DEV_DEVICE_API_URL = "http://192.168.0.141:8000/api";
const DEV_SIMULATOR_API_URL = "http://127.0.0.1:8000/api";
const PROD_API_URL = "https://api.onedining.club/api";

type ExpoExtra = {
  apiUrl?: string;
  productionApiUrl?: string;
};

function readExpoExtra(): ExpoExtra {
  return (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
}

export function resolveApiBaseUrl(): string {
  const extra = readExpoExtra();
  const explicitUrl = process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl;
  if (explicitUrl) {
    return explicitUrl;
  }

  if (__DEV__) {
    // `localhost` / `127.0.0.1` points to the phone itself; a physical device must use the Mac LAN IP.
    return Constants.isDevice ? DEV_DEVICE_API_URL : DEV_SIMULATOR_API_URL;
  }

  return process.env.EXPO_PUBLIC_PRODUCTION_API_URL ?? extra.productionApiUrl ?? PROD_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
