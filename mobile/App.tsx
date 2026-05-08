import "react-native-gesture-handler";

import { Asset } from "expo-asset";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { useNotificationSetup } from "./src/lib/notifications";
import { useAuthStore } from "./src/store/authStore";

let hasAutoGuestBootstrapped = false;

export default function App() {
  const scheme = useColorScheme();
  useNotificationSetup();
  const accessToken = useAuthStore((state) => state.accessToken);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);

  useEffect(() => {
    Asset.loadAsync(require("./assets/one-dining-logo.png")).catch(() => {
      // Keep app startup resilient if asset preloading fails.
    });
  }, []);

  useEffect(() => {
    if (!accessToken && !hasAutoGuestBootstrapped) {
      hasAutoGuestBootstrapped = true;
      continueAsGuest();
    }
  }, [accessToken, continueAsGuest]);

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
