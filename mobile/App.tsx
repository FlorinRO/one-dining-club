import "react-native-gesture-handler";

import { Asset } from "expo-asset";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { useNotificationSetup } from "./src/lib/notifications";

export default function App() {
  const scheme = useColorScheme();
  useNotificationSetup();

  useEffect(() => {
    Asset.loadAsync(require("./assets/one-dining-logo.png")).catch(() => {
      // Keep app startup resilient if asset preloading fails.
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
