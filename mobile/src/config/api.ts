import Constants from "expo-constants";

const DEV_SIMULATOR_API_URL = "http://127.0.0.1:8000/api";
const PROD_API_URL = "https://yumzy.ro/api";

type ExpoExtra = {
  apiUrl?: string;
  productionApiUrl?: string;
};

type ExpoConfigLike = {
  hostUri?: string;
  debuggerHost?: string;
};

function readExpoExtra(): ExpoExtra {
  return (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
}

function readExpoConfigLike(): ExpoConfigLike {
  return (Constants.expoConfig ?? {}) as ExpoConfigLike;
}

function devUrlFromExpoHost(): string | null {
  const config = readExpoConfigLike();
  const rawHost = config.hostUri ?? config.debuggerHost;
  if (!rawHost) return null;

  const host = rawHost.split(":")[0]?.trim();
  if (!host) return null;

  if (host === "localhost" || host === "127.0.0.1") {
    return null;
  }

  return `http://${host}:8000/api`;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveApiBaseUrl(): string {
  const extra = readExpoExtra();

  if (__DEV__) {
    const explicitDevUrl = process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? "";
    const normalizedExplicitDevUrl = explicitDevUrl.trim();
    if (
      normalizedExplicitDevUrl &&
      !normalizedExplicitDevUrl.includes("<YOUR_LOCAL_IP>") &&
      isValidHttpUrl(normalizedExplicitDevUrl)
    ) {
      return normalizedExplicitDevUrl;
    }

    // In Expo dev on a physical device, reuse the Metro host IP automatically.
    const inferredDevUrl = devUrlFromExpoHost();
    if (inferredDevUrl) {
      return inferredDevUrl;
    }

    return DEV_SIMULATOR_API_URL;
  }

  return process.env.EXPO_PUBLIC_PRODUCTION_API_URL ?? extra.productionApiUrl ?? PROD_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
