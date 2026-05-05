import { Clock3, Heart, Star, Truck } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { deliveryWindow, money } from "../lib/format";
import { FALLBACK_RESTAURANT_IMAGE, resolveImageUri } from "../lib/images";
import { useFavoritesStore } from "../store/favoritesStore";
import { colors } from "../theme/colors";
import { Restaurant } from "../types/models";

type Props = {
  restaurant: Restaurant;
  onPress: () => void;
  compact?: boolean;
  small?: boolean;
  smallImageOnly?: boolean;
  medium?: boolean;
};

export function RestaurantCard({ restaurant, onPress, compact, small, smallImageOnly, medium }: Props) {
  const toggleRestaurant = useFavoritesStore((state) => state.toggleRestaurant);
  const isFavorite = useFavoritesStore((state) => state.isRestaurantFavorite(restaurant.id));

  return (
    <Pressable onPress={onPress} style={[styles.card, compact && styles.compact, small && styles.smallCard, medium && styles.mediumCard]}>
      <View style={styles.mediaWrap}>
        <Image
          source={{ uri: resolveImageUri(restaurant.cover_image, FALLBACK_RESTAURANT_IMAGE) }}
          style={[styles.image, (small || smallImageOnly) && styles.smallImage]}
        />
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            toggleRestaurant(restaurant.id);
          }}
          style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
        >
          <Heart size={18} stroke={isFavorite ? colors.red : colors.white} fill={isFavorite ? colors.red : "transparent"} />
        </Pressable>
        <View style={[styles.ratingBadge, small && styles.smallRatingBadge]}>
          <Star size={small ? 12 : 14} stroke={colors.red} fill={colors.red} />
          <Text style={[styles.ratingBadgeText, small && styles.smallRatingBadgeText]}>
            {Number(restaurant.rating).toFixed(1)} ({restaurant.reviews_count ?? 0})
          </Text>
        </View>
        {!restaurant.is_open && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>Închis</Text>
          </View>
        )}
      </View>
      <View style={[styles.body, small && styles.smallBody]}>
        <View style={styles.row}>
          <Text style={[styles.name, small && styles.smallName]} numberOfLines={1}>
            {restaurant.name}
          </Text>
        </View>
        <View style={[styles.metaRow, small && styles.smallMetaRow]}>
          <View style={styles.metaItem}>
            <Clock3 size={small ? 13 : 15} stroke={colors.muted} />
            <Text style={[styles.metaText, small && styles.smallMetaText]}>
              {deliveryWindow(restaurant.estimated_delivery_time_min, restaurant.estimated_delivery_time_max)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Truck size={small ? 13 : 15} stroke={colors.muted} />
            <Text style={[styles.metaText, small && styles.smallMetaText]}>{money(restaurant.delivery_fee)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 318,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  compact: {
    width: "100%",
  },
  smallCard: {
    width: 256,
  },
  mediumCard: {
    width: 276,
  },
  image: {
    height: 180,
    width: "100%",
    backgroundColor: colors.cardSoft,
  },
  smallImage: {
    height: 144,
  },
  mediaWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  closedText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteButtonActive: {
    backgroundColor: colors.white,
  },
  ratingBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    height: 34,
    borderRadius: 11,
    paddingHorizontal: 10,
    backgroundColor: "#F9EDC3",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  ratingBadgeText: {
    color: "#141414",
    fontWeight: "700",
    fontSize: 12,
  },
  smallRatingBadge: {
    height: 28,
    borderRadius: 10,
    paddingHorizontal: 7,
    gap: 4,
  },
  smallRatingBadgeText: {
    fontSize: 10,
  },
  body: {
    paddingHorizontal: 2,
    paddingTop: 12,
    gap: 8,
  },
  smallBody: {
    paddingTop: 9,
    gap: 6,
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
    fontSize: 17,
    fontWeight: "700",
  },
  smallName: {
    fontSize: 14,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 22,
  },
  smallMetaRow: {
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    color: colors.text,
    fontWeight: "500",
    fontSize: 14,
  },
  smallMetaText: {
    fontSize: 11,
  },
});
