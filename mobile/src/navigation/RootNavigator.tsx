import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { Linking } from "react-native";

import { AuthStack } from "./AuthStack";
import { flushPendingNotificationNavigation, navigationRef, openProductFromLink } from "./navigationRef";
import { MainTabs } from "./MainTabs";
import { RootStackParamList } from "./types";
import { parseSharedProductId } from "../lib/productLinks";
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
    if (accessToken || isGuest) {
      flushPendingNotificationNavigation();
    }
  }, [accessToken, isGuest]);

  useEffect(() => {
    const handleUrl = (url: string | null | undefined) => {
      if (!url) return;
      const productId = parseSharedProductId(url);
      if (productId) {
        void openProductFromLink(productId);
      }
    };

    Linking.getInitialURL().then(handleUrl).catch(() => {
      // Ignore malformed startup URLs and keep app boot resilient.
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
