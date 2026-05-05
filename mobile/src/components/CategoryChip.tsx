import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../theme/colors";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function CategoryChip({ label, active, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.active]}>
      <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  text: {
    color: colors.text,
    fontWeight: "700",
  },
  activeText: {
    color: colors.background,
  },
});

