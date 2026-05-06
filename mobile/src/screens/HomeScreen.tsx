import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Filter, MapPin, Search, SearchX } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { restaurantsApi } from "../api/restaurantsApi";
import { RestaurantCard } from "../components/RestaurantCard";
import { Screen } from "../components/Screen";
import { HomeStackParamList } from "../navigation/types";
import { useFavoritesStore } from "../store/favoritesStore";
import { colors } from "../theme/colors";
import { Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

type CarouselItem = {
  label: string;
  emoji: string;
  action?: "favorites";
};

const baseProductCarousel: CarouselItem[] = [
  { label: "Italian", emoji: "🇮🇹" },
  { label: "Pizza", emoji: "🍕" },
  { label: "Burgers", emoji: "🍔" },
  { label: "Asian", emoji: "🥡" },
  { label: "Sushi", emoji: "🍣" },
  { label: "Kebab", emoji: "🥙" },
  { label: "Wraps", emoji: "🌯" },
  { label: "Chicken", emoji: "🍗" },
  { label: "Sandwich", emoji: "🥪" },
  { label: "Japanese", emoji: "🍤" },
  { label: "Bakery", emoji: "🥐" },
  { label: "Groceries", emoji: "🛒" },
  { label: "Healthy", emoji: "🥑" },
  { label: "Middle Eastern", emoji: "🥗" },
  { label: "Thai", emoji: "🍜" },
  { label: "Salads", emoji: "🥙" },
  { label: "Ramen", emoji: "🍜" },
  { label: "Seafood", emoji: "🦐" },
  { label: "Desserts", emoji: "🧁" },
  { label: "Indian", emoji: "🇮🇳" },
  { label: "Breakfast", emoji: "🍳" },
  { label: "Pasta", emoji: "🍝" },
  { label: "Coffee", emoji: "☕" },
  { label: "BBQ", emoji: "🍖" },
  { label: "Soup", emoji: "🍲" },
];

const sectionShuffle = (id: number, seed: number) => ((id * 37 + seed * 17) % 97) / 97;

export function HomeScreen({ navigation }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Toate");
  const favoriteRestaurantIds = useFavoritesStore((state) => state.restaurantIds);
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [searchBarY, setSearchBarY] = useState(0);
  const lastScrollY = useRef(0);
  const stickyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    restaurantsApi.list().then(setRestaurants);
  }, []);

  useEffect(() => {
    Animated.timing(stickyAnim, {
      toValue: showStickySearch ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [showStickySearch, stickyAnim]);

  const filtered = useMemo(() => {
    return restaurants.filter((restaurant) => {
      const matchesSearch = restaurant.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === "Toate" || restaurant.categories?.some((category) => category.name === activeCategory);
      return matchesSearch && matchesCategory;
    });
  }, [restaurants, search, activeCategory]);

  const nearbyRestaurants = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const distanceA = Number(a.distance_km ?? 99);
      const distanceB = Number(b.distance_km ?? 99);
      if (distanceA !== distanceB) return distanceA - distanceB;
      return sectionShuffle(a.id, 1) - sectionShuffle(b.id, 1);
    });
  }, [filtered]);

  const recommendedRestaurants = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const scoreA = Number(a.rating) + Number(a.reviews_count ?? 0) * 0.001 + (a.has_offer ? 0.25 : 0);
      const scoreB = Number(b.rating) + Number(b.reviews_count ?? 0) * 0.001 + (b.has_offer ? 0.25 : 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return sectionShuffle(a.id, 2) - sectionShuffle(b.id, 2);
    });
  }, [filtered]);

  const allRestaurants = useMemo(() => {
    return [...filtered].sort((a, b) => sectionShuffle(a.id, 3) - sectionShuffle(b.id, 3));
  }, [filtered]);
  const hasSearchQuery = search.trim().length > 0;
  const showEmptySearchState = hasSearchQuery && filtered.length === 0;

  const carouselItems = useMemo(() => {
    if (favoriteRestaurantIds.length === 0) {
      return baseProductCarousel;
    }

    return [{ label: "Favourites", emoji: "❤️", action: "favorites" as const }, ...baseProductCarousel];
  }, [favoriteRestaurantIds.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const isScrollingUp = currentY < lastScrollY.current - 4;
    const isScrollingDown = currentY > lastScrollY.current + 4;
    const hasReachedInlineSearch = currentY <= searchBarY;

    if (hasReachedInlineSearch) {
      setShowStickySearch(false);
    } else if (isScrollingUp) {
      setShowStickySearch(true);
    } else if (isScrollingDown) {
      setShowStickySearch(false);
    }

    lastScrollY.current = currentY;
  };

  return (
    <Screen>
      <Animated.View
        pointerEvents={showStickySearch ? "auto" : "none"}
        style={[
          styles.searchStickyOverlay,
          {
            opacity: stickyAnim,
            transform: [
              {
                translateY: stickyAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-14, 0],
                }),
              },
            ],
          },
        ]}
      >
        {showStickySearch ? (
          <View style={styles.searchBar}>
            <Search size={20} stroke={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Caută restaurante sau preparate"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
            />
            <Pressable style={styles.filterButton}>
              <Filter size={18} stroke={colors.text} />
            </Pressable>
          </View>
        ) : null}
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} onScroll={handleScroll} scrollEventThrottle={16}>
        <View style={styles.header}>
          <View style={styles.locationRow}>
            <MapPin size={18} stroke={colors.lime} />
            <Text style={styles.location}>București, centru</Text>
          </View>
        </View>

        <View
          style={styles.searchStickyWrap}
          onLayout={(event) => {
            setSearchBarY(event.nativeEvent.layout.y);
          }}
        >
          <View style={styles.searchBar}>
            <Search size={20} stroke={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Caută restaurante sau preparate"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
            />
            <Pressable style={styles.filterButton}>
              <Filter size={18} stroke={colors.text} />
            </Pressable>
          </View>
        </View>

        <FlatList
          horizontal
          data={carouselItems}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <Pressable
              style={styles.categoryTile}
              onPress={() => {
                if (item.action === "favorites") {
                  navigation.navigate("Favorites");
                  return;
                }

                navigation.getParent()?.navigate("SearchTab", { category: item.label });
              }}
            >
              <View style={styles.categoryCircle}>
                <Text style={styles.categoryEmoji}>{item.emoji}</Text>
              </View>
              <Text style={styles.categoryLabel}>{item.label}</Text>
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
          contentContainerStyle={styles.chips}
        />

        {showEmptySearchState ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <SearchX size={24} stroke={colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>Niciun rezultat</Text>
            <Text style={styles.emptyText}>Nu există rezultate pentru „{search.trim()}”.</Text>
          </View>
        ) : (
          <>
            <View style={[styles.sectionBlock, styles.firstSectionBlock]}>
              <SectionHeader
                title="Aproape de tine"
                actionLabel="Toate >"
                onPressAction={() => navigation.navigate("SectionRestaurants", { mode: "nearby", title: "Aproape de tine" })}
              />
              <FlatList
                horizontal
                data={nearbyRestaurants}
                keyExtractor={(item) => `nearby-${item.id}`}
                renderItem={({ item }) => (
                  <RestaurantCard medium smallImageOnly restaurant={item} onPress={() => navigation.navigate("RestaurantDetails", { restaurant: item })} />
                )}
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
              />
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader
                title="Recomandate"
                actionLabel="Toate >"
                onPressAction={() => navigation.navigate("SectionRestaurants", { mode: "recommended", title: "Recomandate" })}
              />
              <FlatList
                horizontal
                data={recommendedRestaurants}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <RestaurantCard medium smallImageOnly restaurant={item} onPress={() => navigation.navigate("RestaurantDetails", { restaurant: item })} />
                )}
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
              />
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader title="Toate restaurantele" />
              <View style={styles.allRestaurantsList}>
                {allRestaurants.map((restaurant) => (
                  <RestaurantCard
                    key={`all-${restaurant.id}`}
                    compact
                    restaurant={restaurant}
                    onPress={() => navigation.navigate("RestaurantDetails", { restaurant })}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ title, actionLabel, onPressAction }: { title: string; actionLabel?: string; onPressAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onPressAction ? (
        <Pressable onPress={onPressAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 14,
    paddingBottom: 120,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  location: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchBar: {
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  searchStickyWrap: {
    backgroundColor: colors.background,
    paddingVertical: 4,
  },
  searchStickyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  chips: {
    paddingVertical: 4,
  },
  categoryTile: {
    alignItems: "center",
    gap: 8,
    width: 74,
  },
  categoryCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionAction: {
    color: colors.red,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 30,
    gap: 8,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 2,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  allRestaurantsList: {
    gap: 28,
  },
  sectionBlock: {
    gap: 12,
    marginTop: 22,
  },
  firstSectionBlock: {
    marginTop: 0,
  },
});
