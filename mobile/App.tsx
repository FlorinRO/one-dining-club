import "react-native-gesture-handler";

import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { useNotificationSetup } from "./src/lib/notifications";

export default function App() {
  const scheme = useColorScheme();
  useNotificationSetup();

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
