import { NavigationContainer, DefaultTheme } from "@react-navigation/native";

import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

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

  return <NavigationContainer theme={theme}>{accessToken ? <MainTabs /> : <AuthStack />}</NavigationContainer>;
}

