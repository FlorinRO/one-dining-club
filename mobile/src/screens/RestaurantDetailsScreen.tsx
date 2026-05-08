import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Bike, Clock3, Heart, Search, SearchX, Share2, Star, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Keyboard, LayoutChangeEvent, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { restaurantsApi } from "../api/restaurantsApi";
import { CategoryChip } from "../components/CategoryChip";
import { FloatingCartBar } from "../components/FloatingCartBar";
import { FALLBACK_RESTAURANT_IMAGE, resolveImageUri } from "../lib/images";
import { ProductCard } from "../components/ProductCard";
import { useFavoritesStore } from "../store/favoritesStore";
import { HomeStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { Product, ProductCategory, Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "RestaurantDetails">;

export function RestaurantDetailsScreen({ navigation, route }: Props) {
  const HERO_HEIGHT = 258;
  const SHEET_OVERLAP = 34;
  const SHEET_WAVE_HEIGHT = 42;
  const initialRestaurant = route.params.restaurant;
  const [restaurant, setRestaurant] = useState<Restaurant>(initialRestaurant);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [isRestaurantSearchOpen, setIsRestaurantSearchOpen] = useState(false);
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState("");
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const restaurantSearchInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [categoryOffsets, setCategoryOffsets] = useState<Record<string, number>>({});
  const toggleRestaurant = useFavoritesStore((state) => state.toggleRestaurant);
  const isFavorite = useFavoritesStore((state) => state.isRestaurantFavorite(restaurant.id));

  useEffect(() => {
    restaurantsApi.detail(initialRestaurant.id).then(setRestaurant);
    restaurantsApi.products(initialRestaurant.id).then(setProducts);
    restaurantsApi.categories(initialRestaurant.id).then(setCategories);
  }, [initialRestaurant.id]);

  const sections = useMemo(() => {
    const mapped = categories
      .map((category) => ({
        key: `category-${category.id}`,
        id: category.id,
        label: category.name,
        products: products.filter((product) => product.category === category.id),
      }))
      .filter((section) => section.products.length > 0);
    const knownCategoryIds = new Set(categories.map((category) => category.id));
    const uncategorized = products.filter((product) => !knownCategoryIds.has(product.category));
    if (uncategorized.length > 0) {
      mapped.push({
        key: "category-other",
        id: -1,
        label: "Altele",
        products: uncategorized,
      });
    }
    return mapped;
  }, [categories, products]);
  const restaurantSearchResults = useMemo(() => {
    const query = restaurantSearchQuery.trim().toLowerCase();
    if (!query) return [];
    return products.filter((product) => `${product.name} ${product.description} ${product.category_name ?? ""}`.toLowerCase().includes(query));
  }, [products, restaurantSearchQuery]);
  const hasSearchQuery = restaurantSearchQuery.trim().length > 0;

  const heroScale = scrollY.interpolate({
    inputRange: [-220, 0],
    outputRange: [1.5, 1],
    extrapolate: "clamp",
  });
  const heroScrollOut = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [0, -HERO_HEIGHT],
    extrapolate: "clamp",
  });
  const overscrollCompensation = scrollY.interpolate({
    inputRange: [-220, 0],
    outputRange: [-220, 0],
    extrapolate: "clamp",
  });
  const stickyHeaderTranslateY = scrollY.interpolate({
    inputRange: [70, 140],
    outputRange: [-16, 0],
    extrapolate: "clamp",
  });
  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [70, 140],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const shareRestaurant = async () => {
    await Share.share({
      title: restaurant.name,
      message: `${restaurant.name}\n${restaurant.description}`,
    });
  };
  const openRestaurantSearch = () => {
    setIsRestaurantSearchOpen(true);
    setTimeout(() => restaurantSearchInputRef.current?.focus(), 50);
  };
  const closeRestaurantSearch = () => {
    setIsRestaurantSearchOpen(false);
    setRestaurantSearchQuery("");
    setIsSearchInputFocused(false);
  };
  const setCategoryOffset = (key: string, event: LayoutChangeEvent) => {
    const y = event.nativeEvent.layout.y;
    setCategoryOffsets((prev) => (prev[key] === y ? prev : { ...prev, [key]: y }));
  };
  const scrollToCategory = (category: number | "all") => {
    setActiveCategory(category);
    if (!scrollViewRef.current) return;
    if (category === "all") {
      const topOffset = categoryOffsets.all ?? 0;
      scrollViewRef.current.scrollTo({ y: Math.max(0, topOffset - 196), animated: true });
      return;
    }
    const sectionOffset = categoryOffsets[`category-${category}`];
    if (typeof sectionOffset === "number") {
      scrollViewRef.current.scrollTo({ y: Math.max(0, sectionOffset - 196), animated: true });
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.heroWrap, { transform: [{ translateY: heroScrollOut }] }]}>
        <Animated.Image
          source={{ uri: resolveImageUri(restaurant.cover_image, FALLBACK_RESTAURANT_IMAGE) }}
          style={[
            styles.hero,
            {
              height: HERO_HEIGHT,
              transform: [{ scale: heroScale }],
            },
          ]}
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroName}>{restaurant.name}</Text>
          <Text style={styles.heroInfo}>Info &gt;</Text>
        </View>
      </Animated.View>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.contentScroller}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        <Animated.View style={{ transform: [{ translateY: overscrollCompensation }] }}>
          <View style={[styles.bodySheetWrap, { marginTop: HERO_HEIGHT - SHEET_OVERLAP }]} pointerEvents="box-none">
            <Svg
              width="100%"
              height={SHEET_WAVE_HEIGHT}
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
              style={styles.sheetWave}
              pointerEvents="none"
            >
              <Path
                d="M0,52 C120,8 240,8 360,52 C480,96 600,96 720,52 C840,8 960,8 1080,52 C1200,96 1320,96 1440,52 L1440,120 L0,120 Z"
                fill={colors.white}
              />
            </Svg>
            <View style={styles.bodySheet}>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Star size={16} stroke={colors.lime} fill={colors.lime} />
                  <Text style={styles.metaText}>
                    {Number(restaurant.rating).toFixed(1)} ({restaurant.reviews_count ?? 0})
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Bike size={16} stroke={colors.muted} />
                  <Text style={styles.metaText}>{Number(restaurant.delivery_fee).toFixed(2)} lei</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock3 size={16} stroke={colors.muted} />
                  <Text style={styles.metaText}>
                    {restaurant.estimated_delivery_time_min}-{restaurant.estimated_delivery_time_max} min
                  </Text>
                </View>
              </View>
              <View style={styles.products}>
                <View onLayout={(event) => setCategoryOffset("all", event)} />
                {sections.map((section) => (
                  <View key={section.key} onLayout={(event) => setCategoryOffset(section.key, event)} style={styles.sectionBlock}>
                    <Text style={styles.sectionTitle}>{section.label}</Text>
                    <View style={styles.sectionProducts}>
                      {section.products.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onPress={() => navigation.navigate("ProductDetails", { restaurant, product })}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.ScrollView>
      <View style={styles.headerControls} pointerEvents="box-none">
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft stroke={colors.text} size={22} />
        </Pressable>
        <View style={styles.rightControls}>
          <Pressable onPress={() => toggleRestaurant(restaurant.id)} style={[styles.iconButton, isFavorite && styles.iconButtonActive]}>
            <Heart stroke={isFavorite ? colors.red : colors.text} fill={isFavorite ? colors.red : "transparent"} size={20} />
          </Pressable>
          <Pressable onPress={shareRestaurant} style={styles.iconButton}>
            <Share2 stroke={colors.text} size={20} />
          </Pressable>
          <Pressable onPress={openRestaurantSearch} style={styles.iconButton}>
            <Search stroke={colors.text} size={20} />
          </Pressable>
        </View>
      </View>
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            opacity: stickyHeaderOpacity,
            transform: [{ translateY: stickyHeaderTranslateY }],
          },
        ]}
      >
        <Text numberOfLines={1} style={styles.stickyHeaderTitle}>
          {restaurant.name}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickyCategories}>
          <CategoryChip
            label="Toate"
            active={activeCategory === "all"}
            onPress={() => scrollToCategory("all")}
            stabilizeWidthOnActive
            style={styles.stickyCategoryChip}
            activeStyle={styles.stickyCategoryChipActive}
            textStyle={styles.stickyCategoryText}
            activeTextStyle={styles.stickyCategoryTextActive}
          />
          {categories.map((category) => (
            <CategoryChip
              key={`sticky-${category.id}`}
              label={category.name}
              active={activeCategory === category.id}
              onPress={() => scrollToCategory(category.id)}
              stabilizeWidthOnActive
              style={styles.stickyCategoryChip}
              activeStyle={styles.stickyCategoryChipActive}
              textStyle={styles.stickyCategoryText}
              activeTextStyle={styles.stickyCategoryTextActive}
            />
          ))}
        </ScrollView>
      </Animated.View>
      <FloatingCartBar onPress={() => navigation.navigate("CartFlow", { screen: "CartHome" })} />
      {isRestaurantSearchOpen && (
        <View style={styles.searchOverlay}>
          <View style={styles.searchHeader}>
            <View style={[styles.searchBar, isSearchInputFocused && styles.searchBarFocused]}>
              <Search stroke={colors.muted} size={18} />
              <TextInput
                ref={restaurantSearchInputRef}
                value={restaurantSearchQuery}
                onChangeText={setRestaurantSearchQuery}
                onFocus={() => setIsSearchInputFocused(true)}
                onBlur={() => setIsSearchInputFocused(false)}
                placeholder="Caută în acest restaurant"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                autoFocus
                returnKeyType="search"
              />
            </View>
            <Pressable onPress={closeRestaurantSearch} style={styles.searchCloseButton}>
              <X stroke={colors.text} size={18} />
            </Pressable>
          </View>
          <View style={styles.searchBody}>
            {!hasSearchQuery && (
              <Pressable style={styles.searchIdleSurface} onPress={closeRestaurantSearch} />
            )}
            {hasSearchQuery && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.searchContent}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={() => Keyboard.dismiss()}
              >
                <Text style={styles.searchCount}>
                  {restaurantSearchResults.length} rezultat{restaurantSearchResults.length === 1 ? "" : "e"}
                </Text>
                {restaurantSearchResults.length === 0 ? (
                  <View style={styles.noResultsWrap}>
                    <View style={styles.noResultsIcon}>
                      <SearchX stroke={colors.muted} size={22} />
                    </View>
                    <Text style={styles.noResultsTitle}>N-am găsit nimic</Text>
                    <Text style={styles.noResultsText}>Încearcă alt cuvânt cheie pentru produsele acestui restaurant.</Text>
                  </View>
                ) : (
                  <View style={styles.searchResults}>
                    {restaurantSearchResults.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onPress={() => {
                          closeRestaurantSearch();
                          navigation.navigate("ProductDetails", { restaurant, product });
                        }}
                      />
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 110,
  },
  contentScroller: {
    zIndex: 2,
  },
  hero: {
    width: "100%",
    height: 258,
    backgroundColor: colors.cardSoft,
  },
  heroWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 258,
    overflow: "hidden",
    zIndex: 1,
  },
  headerControls: {
    position: "absolute",
    top: 54,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rightControls: {
    flexDirection: "row",
    gap: 8,
  },
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 148,
    zIndex: 8,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stickyHeaderTitle: {
    position: "absolute",
    top: 64,
    left: 72,
    right: 16,
    color: colors.text,
    fontSize: 19,
    fontWeight: "700",
    textAlign: "left",
  },
  stickyCategories: {
    marginTop: 104,
    paddingHorizontal: 6,
    gap: 10,
  },
  stickyCategoryChip: {
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 8,
    height: 34,
  },
  stickyCategoryChipActive: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  stickyCategoryText: {
    fontSize: 16,
    fontWeight: "400",
    color: colors.text,
  },
  stickyCategoryTextActive: {
    fontWeight: "700",
    color: colors.text,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  iconButtonActive: {
    backgroundColor: colors.white,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 58,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 2,
  },
  heroName: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700",
    textAlign: "center",
  },
  heroInfo: {
    marginTop: 4,
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  bodySheetWrap: {
    backgroundColor: "transparent",
    zIndex: 5,
  },
  sheetWave: {
    marginBottom: -1,
  },
  bodySheet: {
    padding: 18,
    gap: 16,
    backgroundColor: colors.white,
    paddingTop: 12,
    overflow: "hidden",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 92,
  },
  metaText: {
    color: colors.text,
    fontWeight: "600",
  },
  products: {
    marginTop: 10,
    gap: 14,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionProducts: {
    gap: 12,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  searchHeader: {
    backgroundColor: colors.white,
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 2,
  },
  searchBody: {
    flex: 1,
    backgroundColor: "transparent",
  },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBarFocused: {
    borderColor: colors.red,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  searchCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },
  searchIdleSurface: {
    flex: 1,
    backgroundColor: "transparent",
  },
  searchCount: {
    color: colors.muted,
    fontWeight: "700",
  },
  searchResults: {
    gap: 12,
  },
  noResultsWrap: {
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noResultsIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  noResultsTitle: {
    marginTop: 12,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  noResultsText: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },
});
