import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { money } from "../lib/format";
import { colors } from "../theme/colors";
import { Product } from "../types/models";

type Props = {
  product: Product;
  onPress: () => void;
};

export function ProductCard({ product, onPress }: Props) {
  const effectivePrice = product.effective_price ?? product.discount_price ?? product.price;
  const hasDiscount = product.discount_price != null;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{product.name}</Text>
          {product.is_popular && <Text style={styles.badge}>Popular</Text>}
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {product.description}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{money(effectivePrice)}</Text>
          {hasDiscount && <Text style={styles.oldPrice}>{money(product.price)}</Text>}
        </View>
      </View>
      <Image source={{ uri: product.image ?? undefined }} style={styles.image} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 118,
    padding: 12,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    gap: 12,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  badge: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "800",
  },
  description: {
    color: colors.muted,
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  price: {
    color: colors.lime,
    fontSize: 16,
    fontWeight: "900",
  },
  oldPrice: {
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 18,
    backgroundColor: colors.cardSoft,
  },
});

