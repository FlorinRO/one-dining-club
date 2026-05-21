import "react-native-gesture-handler";

import { Asset } from "expo-asset";
import { setAudioModeAsync } from "expo-audio";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Appearance, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { useNotificationSetup } from "./src/lib/notifications";
import { useAuthStore } from "./src/store/authStore";
import { usePreferencesStore } from "./src/store/preferencesStore";
import { demoProductAudioSources } from "./src/data/demoAudio";

let hasAutoGuestBootstrapped = false;

export default function App() {
  const scheme = useColorScheme();
  useNotificationSetup();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const preferencesHydrated = usePreferencesStore((state) => state.hasHydrated);
  const themePreference = usePreferencesStore((state) => state.themePreference);

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
    if (!preferencesHydrated) return;
    Appearance.setColorScheme(themePreference === "system" ? null : themePreference);
  }, [preferencesHydrated, themePreference]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
