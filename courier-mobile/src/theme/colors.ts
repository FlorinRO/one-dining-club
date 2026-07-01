import { Appearance, DynamicColorIOS, Platform } from "react-native";

function dynamic(light: string, dark: string) {
  if (Platform.OS === "ios") {
    return DynamicColorIOS({ light, dark }) as unknown as string;
  }

  return Appearance.getColorScheme() === "dark" ? dark : light;
}

export const colors = {
  background: dynamic("#FFFFFF", "#0A0A0A"),
  surface: dynamic("#FFFFFF", "#101010"),
  card: dynamic("#FFFFFF", "#141414"),
  cardSoft: dynamic("#F8F8F8", "#1B1B1B"),
  cardSelected: dynamic("#EFF9DE", "#1D2417"),
  successSoft: dynamic("#EEF9DE", "#182414"),
  border: dynamic("#EAEAEA", "#292929"),
  text: dynamic("#151515", "#F5F5F5"),
  muted: dynamic("#7A7A7A", "#A7A7A7"),
  red: dynamic("#B8F26D", "#B8F26D"),
  redDark: dynamic("#99D64A", "#99D64A"),
  green: dynamic("#A8EB4F", "#A8EB4F"),
  greenDark: dynamic("#8CCC3A", "#8CCC3A"),
  dangerSoft: dynamic("#FCEBEB", "#2A1818"),
  lime: dynamic("#B8F26D", "#B8F26D"),
  limeDark: dynamic("#99D64A", "#99D64A"),
  warning: dynamic("#F59E0B", "#F6B93B"),
  white: "#FFFFFF",
};
