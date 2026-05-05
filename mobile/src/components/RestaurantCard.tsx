import { Clock3, Star, Truck } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { deliveryWindow, money } from "../lib/format";
import { colors } from "../theme/colors";
import { Restaurant } from "../types/models";

type Props = {
  restaurant: Restaurant;
  onPress: () => void;
  compact?: boolean;
};

export function RestaurantCard({ restaurant, onPress, compact }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.card, compact && styles.compact]}>
      <Image source={{ uri: restaurant.cover_image ?? undefined }} style={styles.image} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
          {restaurant.is_open && (
            <View style={styles.openBadge}>
              <Text style={styles.openText}>Deschis</Text>
            </View>
          )}
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {restaurant.description}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Star size={15} stroke={colors.lime} fill={colors.lime} />
            <Text style={styles.metaText}>{Number(restaurant.rating).toFixed(1)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock3 size={15} stroke={colors.muted} />
            <Text style={styles.metaText}>
              {deliveryWindow(restaurant.estimated_delivery_time_min, restaurant.estimated_delivery_time_max)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Truck size={15} stroke={colors.muted} />
            <Text style={styles.metaText}>{money(restaurant.delivery_fee)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 286,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compact: {
    width: "100%",
  },
  image: {
    height: 142,
    width: "100%",
    backgroundColor: colors.cardSoft,
  },
  body: {
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  openBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "rgba(184, 242, 109, 0.16)",
  },
  openText: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: "800",
  },
  description: {
    color: colors.muted,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
});

