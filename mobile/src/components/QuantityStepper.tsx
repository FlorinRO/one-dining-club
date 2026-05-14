import { Minus, Plus } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";

type Props = {
  value: number;
  onIncrease: () => void;
  onDecrease: () => void;
};

export function QuantityStepper({ value, onIncrease, onDecrease }: Props) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onDecrease} style={styles.button}>
        <Minus size={18} stroke={colors.text} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable onPress={onIncrease} style={styles.button}>
        <Plus size={18} stroke={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 21,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    minWidth: 24,
    textAlign: "center",
    color: colors.text,
    fontWeight: "500",
  },
});
