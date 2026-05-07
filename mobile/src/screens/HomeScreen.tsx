import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MapPin, Search, SearchX, SlidersHorizontal } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
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
  const [hasLoadedRestaurants, setHasLoadedRestaurants] = useState(false);
  const [hasMetSplashTime, setHasMetSplashTime] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Toate");
  const favoriteRestaurantIds = useFavoritesStore((state) => state.restaurantIds);
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [searchBarY, setSearchBarY] = useState(0);
  const lastScrollY = useRef(0);
  const stickyAnim = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const logoPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    restaurantsApi
      .list()
      .then((items) => {
        if (isMounted) {
          setRestaurants(items);
        }
      })
      .finally(() => {
        if (isMounted) {
          setHasLoadedRestaurants(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setHasMetSplashTime(true), 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 820,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 0,
          duration: 820,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [logoPulse]);

  useEffect(() => {
    if (!hasLoadedRestaurants || !hasMetSplashTime) {
      return;
    }

    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShowSplash(false);
      }
    });
  }, [hasLoadedRestaurants, hasMetSplashTime, splashOpacity]);

  useEffect(() => {
    Animated.timing(stickyAnim, {
      toValue: showStickySearch ? 1 : 0,
      duration: 140,
      easing: Easing.out(Easing.cubic),
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
    const currentY = Math.max(0, event.nativeEvent.contentOffset.y);
    const delta = currentY - lastScrollY.current;
    const topHideThreshold = searchBarY + 10;
    const showThreshold = searchBarY + 30;

    if (currentY <= topHideThreshold) {
      if (showStickySearch) setShowStickySearch(false);
      lastScrollY.current = currentY;
      return;
    }

    if (delta <= -1.5 && currentY > showThreshold) {
      if (!showStickySearch) setShowStickySearch(true);
    } else if (delta >= 1.5) {
      if (showStickySearch) setShowStickySearch(false);
    }

    lastScrollY.current = currentY;
  };

  const openSearchWithFocus = () => {
    navigation.getParent()?.navigate("SearchTab", { focusSearch: true });
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
                  outputRange: [-10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable style={styles.searchBar} onPress={openSearchWithFocus}>
          <Search size={23} stroke={colors.text} strokeWidth={2.6} />
          <View style={styles.searchInputProxy} pointerEvents="none">
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Caută restaurante sau preparate"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              editable={false}
              showSoftInputOnFocus={false}
            />
          </View>
          <Pressable hitSlop={8} onPress={() => navigation.getParent()?.navigate("SearchTab", { openFilters: true })}>
            <SlidersHorizontal size={22} stroke={colors.text} strokeWidth={2.7} />
          </Pressable>
        </Pressable>
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
          <Pressable style={styles.searchBar} onPress={openSearchWithFocus}>
            <Search size={23} stroke={colors.text} strokeWidth={2.6} />
            <View style={styles.searchInputProxy} pointerEvents="none">
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Caută restaurante sau preparate"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                editable={false}
                showSoftInputOnFocus={false}
              />
            </View>
            <Pressable hitSlop={8} onPress={() => navigation.getParent()?.navigate("SearchTab", { openFilters: true })}>
              <SlidersHorizontal size={22} stroke={colors.text} strokeWidth={2.7} />
            </Pressable>
          </Pressable>
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

      {showSplash ? <HomeLoadingOverlay opacity={splashOpacity} pulse={logoPulse} /> : null}
    </Screen>
  );
}

function HomeLoadingOverlay({ opacity, pulse }: { opacity: Animated.Value; pulse: Animated.Value }) {
  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.06],
  });
  const glowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.18],
  });
  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.78],
  });

  return (
    <Animated.View pointerEvents="auto" style={[styles.loadingOverlay, { opacity }]}>
      <Animated.View
        style={[
          styles.logoGlow,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />
      <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
        <Image source={require("../../assets/one-dining-logo.png")} style={styles.loadingLogo} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
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
  searchBar: {
    height: 50,
    borderRadius: 13,
    backgroundColor: "#F0F2F3",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
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
    fontSize: 17,
  },
  searchInputProxy: {
    flex: 1,
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  logoGlow: {
    position: "absolute",
    width: 224,
    height: 224,
    borderRadius: 112,
    backgroundColor: colors.red,
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.72,
    shadowRadius: 30,
    elevation: 18,
  },
  logoWrap: {
    width: 172,
    height: 172,
    borderRadius: 86,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.36,
    shadowRadius: 18,
    elevation: 12,
  },
  loadingLogo: {
    width: 146,
    height: 146,
  },
});
