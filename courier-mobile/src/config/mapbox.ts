import Constants from "expo-constants";

type ExpoExtra = {
  mapboxPublicToken?: string;
};

export function getMapboxAccessToken() {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
  return (process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? extra?.mapboxPublicToken ?? "").trim();
}
