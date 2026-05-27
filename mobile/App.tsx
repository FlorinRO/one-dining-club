import "react-native-gesture-handler";

import { Asset } from "expo-asset";
import { setAudioModeAsync } from "expo-audio";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { useNotificationSetup } from "./src/lib/notifications";
import { useAuthStore } from "./src/store/authStore";
import { demoProductAudioSources } from "./src/data/demoAudio";

let hasAutoGuestBootstrapped = false;

export default function App() {
  useNotificationSetup();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);

  useEffect(() => {
    Asset.loadAsync([require("./assets/one-dining-logo.png"), ...demoProductAudioSources]).catch(() => {
      // Keep app startup resilient if asset preloading fails.
    });
  }, []);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      shouldRouteThroughEarpiece: false,
    }).catch(() => {
      // Keep app usable if audio session setup fails.
    });
  }, []);

  useEffect(() => {
    if (hasHydrated && !accessToken && !hasAutoGuestBootstrapped) {
      hasAutoGuestBootstrapped = true;
      continueAsGuest();
    }
  }, [accessToken, continueAsGuest, hasHydrated]);

  useEffect(() => {
    Appearance.setColorScheme("dark");
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
