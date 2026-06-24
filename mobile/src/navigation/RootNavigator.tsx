import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";

import { AuthStack } from "./AuthStack";
import { flushPendingNotificationNavigation, navigationRef } from "./navigationRef";
import { MainTabs } from "./MainTabs";
import { RootStackParamList } from "./types";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    primary: colors.red,
  },
};

export function RootNavigator() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isGuest = useAuthStore((state) => state.isGuest);

  useEffect(() => {
    if (accessToken) {
      flushPendingNotificationNavigation();
    }
  }, [accessToken]);

  return (
    <NavigationContainer ref={navigationRef} theme={theme} onReady={flushPendingNotificationNavigation}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      >
        {accessToken || isGuest ? (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
