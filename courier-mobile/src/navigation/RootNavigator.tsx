import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AuthNavigator } from "./AuthNavigator";
import { AppTabs } from "./AppTabs";
import { CourierOrderDetailsScreen } from "../screens/CourierOrderDetailsScreen";
import { useAuthStore } from "../store/authStore";
import { useCourierStore } from "../store/courierStore";
import { colors } from "../theme/colors";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#090909",
    card: "#090909",
    text: colors.white,
    border: "rgba(255,255,255,0.08)",
    primary: colors.lime,
  },
};

function SplashState({ label }: { label: string }) {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={colors.lime} />
      <Text style={styles.splashLabel}>{label}</Text>
    </View>
  );
}

export function RootNavigator() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);
  const hydrateCourierSession = useCourierStore((state) => state.hydrateCourierSession);
  const bootstrapping = useCourierStore((state) => state.bootstrapping);
  const [didBootstrap, setDidBootstrap] = useState(false);

  useEffect(() => {
    if (!hasHydrated || !accessToken || user?.role === "courier" || didBootstrap) {
      return;
    }

    hydrateCourierSession()
      .catch(() => {
        // Session reset happens in the store when bootstrapping fails.
      })
      .finally(() => {
        setDidBootstrap(true);
      });
  }, [accessToken, didBootstrap, hasHydrated, hydrateCourierSession, user?.role]);

  useEffect(() => {
    if (!accessToken) {
      setDidBootstrap(false);
    }
  }, [accessToken]);

  if (!hasHydrated) {
    return <SplashState label="Loading YUMZY Courier..." />;
  }

  if (accessToken && !user) {
    return <SplashState label="Restoring courier session..." />;
  }

  if (accessToken && bootstrapping && !didBootstrap) {
    return <SplashState label="Preparing your shift..." />;
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        {accessToken ? (
          <>
            <Stack.Screen name="AppTabs" component={AppTabs} />
            <Stack.Screen name="OrderDetails" component={CourierOrderDetailsScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#090909",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  splashLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
