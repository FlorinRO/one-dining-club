import { Appearance, DynamicColorIOS, Platform } from "react-native";

function dynamic(light: string, dark: string) {
  if (Platform.OS === "ios") {
    return DynamicColorIOS({ light, dark }) as unknown as string;
  }

  return Appearance.getColorScheme() === "dark" ? dark : light;
}

export const colors = {
  background: dynamic("#FFFFFF", "#0A0A0A"),
  surface: dynamic("#FFFFFF", "#111111"),
  card: dynamic("#FFFFFF", "#171717"),
  cardSoft: dynamic("#F8F8F8", "#1E1E1E"),
  border: dynamic("#EAEAEA", "#2A2A2A"),
  text: dynamic("#151515", "#F5F5F5"),
  muted: dynamic("#7A7A7A", "#A3A3A3"),
  red: dynamic("#E53935", "#FF5A55"),
  redDark: dynamic("#C62828", "#E04843"),
  lime: dynamic("#E53935", "#FF5A55"),
  limeDark: dynamic("#C62828", "#E04843"),
  warning: dynamic("#F59E0B", "#F6B93B"),
  white: "#FFFFFF",
};
