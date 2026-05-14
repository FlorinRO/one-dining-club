import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { restaurantsApi } from "../api/restaurantsApi";
import { RestaurantCard } from "../components/RestaurantCard";
import { Screen } from "../components/Screen";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { HomeStackParamList } from "../navigation/types";
import { useFavoritesStore } from "../store/favoritesStore";
import { colors } from "../theme/colors";
import { Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "Favorites">;

export function FavoritesScreen({ navigation }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const favoriteIds = useFavoritesStore((state) => state.restaurantIds);
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();

  useEffect(() => {
    restaurantsApi.list().then(setRestaurants);
  }, []);

  const favorites = useMemo(
    () => restaurants.filter((restaurant) => favoriteIds.includes(restaurant.id)),
    [restaurants, favoriteIds],
  );

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onScroll={trackFloatingCartScrollDirection}
        scrollEventThrottle={16}
      >
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={10}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.title}>Favorite</Text>
        {!favorites.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nu ai favorite încă</Text>
            <Text style={styles.emptyText}>Apasă pe inimă la restaurantele preferate și vor apărea aici.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {favorites.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                compact
                restaurant={restaurant}
                onPress={() => navigation.navigate("RestaurantDetails", { restaurant })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 14,
    paddingBottom: 30,
    gap: 18,
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  list: {
    gap: 20,
  },
  empty: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 21,
  },
});
