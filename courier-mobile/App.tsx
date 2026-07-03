import "react-native-gesture-handler";
import "./src/lib/locationTracking";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { getMapboxAccessToken } from "./src/config/mapbox";
import { getMapboxModule } from "./src/lib/mapboxRuntime";
import { useNotificationSetup } from "./src/lib/notifications";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  useNotificationSetup();

  useEffect(() => {
    Appearance.setColorScheme("light");
  }, []);

  useEffect(() => {
    const token = getMapboxAccessToken();
    const mapbox = getMapboxModule();
    if (!token || !mapbox) {
      return;
    }

    void mapbox.setAccessToken(token).catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
