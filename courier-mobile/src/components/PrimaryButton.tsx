import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { colors } from "../theme/colors";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  variant?: "primary" | "ghost" | "lime";
  style?: ViewStyle;
};

export function PrimaryButton({ title, onPress, disabled, icon, variant = "primary", style }: Props) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "ghost" && styles.ghost,
        variant === "lime" && styles.lime,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.text, variant === "ghost" && styles.ghostText, variant === "lime" && styles.limeText]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  ghost: {
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lime: {
    backgroundColor: colors.lime,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  text: {
    color: colors.background,
    fontSize: 17,
    fontWeight: "800",
  },
  ghostText: {
    color: colors.white,
  },
  limeText: {
    color: colors.background,
  },
});
