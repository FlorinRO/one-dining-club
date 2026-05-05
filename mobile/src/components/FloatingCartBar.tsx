import { ShoppingBag } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { money } from "../lib/format";
import { useCartStore } from "../store/cartStore";
import { colors } from "../theme/colors";

type Props = {
  onPress: () => void;
};

export function FloatingCartBar({ onPress }: Props) {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.calculateTotal());

  if (!items.length) {
    return null;
  }

  return (
    <Pressable onPress={onPress} style={styles.bar}>
      <View style={styles.icon}>
        <ShoppingBag size={20} stroke={colors.background} />
      </View>
      <Text style={styles.text}>{items.length} produse</Text>
      <Text style={styles.total}>{money(total)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    height: 62,
    borderRadius: 24,
    backgroundColor: colors.red,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 12,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lime,
  },
  text: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
  },
  total: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
  },
});

