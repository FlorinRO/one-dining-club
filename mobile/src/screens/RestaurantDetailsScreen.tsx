import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Bike, Clock3, Heart, Search, SearchX, Share2, Star, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Keyboard, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { restaurantsApi } from "../api/restaurantsApi";
import { FloatingCartBar } from "../components/FloatingCartBar";
import { money } from "../lib/format";
import { FALLBACK_PRODUCT_IMAGE, FALLBACK_RESTAURANT_IMAGE, resolveImageUri } from "../lib/images";
import { useFavoritesStore } from "../store/favoritesStore";
import { HomeStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { Product, Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "RestaurantDetails">;

const SHOWCASE_ZIG_ZAG_TOP_PATH =
  "M0 0 H280 V8 L272 0 L264 8 L256 0 L248 8 L240 0 L232 8 L224 0 L216 8 L208 0 L200 8 L192 0 L184 8 L176 0 L168 8 L160 0 L152 8 L144 0 L136 8 L128 0 L120 8 L112 0 L104 8 L96 0 L88 8 L80 0 L72 8 L64 0 L56 8 L48 0 L40 8 L32 0 L24 8 L16 0 L8 8 L0 0 Z";
const SHOWCASE_ZIG_ZAG_BOTTOM_PATH =
  "M0 8 H280 V0 L272 8 L264 0 L256 8 L248 0 L240 8 L232 0 L224 8 L216 0 L208 8 L200 0 L192 8 L184 0 L176 8 L168 0 L160 8 L152 0 L144 8 L136 0 L128 8 L120 0 L112 8 L104 0 L96 8 L88 0 L80 8 L72 0 L64 8 L56 0 L48 8 L40 0 L32 8 L24 0 L16 8 L8 0 L0 8 Z";

export function RestaurantDetailsScreen({ navigation, route }: Props) {
  const HERO_HEIGHT = 258;
  const SHEET_OVERLAP = 34;
  const SHEET_WAVE_HEIGHT = 42;
  const initialRestaurant = route.params.restaurant;
  const [restaurant, setRestaurant] = useState<Restaurant>(initialRestaurant);
  const [products, setProducts] = useState<Product[]>([]);
  const [isRestaurantSearchOpen, setIsRestaurantSearchOpen] = useState(false);
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState("");
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const restaurantSearchInputRef = useRef<TextInput>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const toggleRestaurant = useFavoritesStore((state) => state.toggleRestaurant);
  const isFavorite = useFavoritesStore((state) => state.isRestaurantFavorite(restaurant.id));

  useEffect(() => {
    restaurantsApi.detail(initialRestaurant.id).then(setRestaurant);
    restaurantsApi.products(initialRestaurant.id).then(setProducts);
  }, [initialRestaurant.id]);

  const selectedProducts = useMemo(() => products.slice(0, 5), [products]);

  const restaurantSearchResults = useMemo(() => {
    const query = restaurantSearchQuery.trim().toLowerCase();
    if (!query) return [];
    return selectedProducts.filter((product) =>
      `${product.name} ${product.description} ${product.category_name ?? ""}`.toLowerCase().includes(query),
    );
  }, [selectedProducts, restaurantSearchQuery]);
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
                <View style={styles.menuSeparator} />
                <View style={styles.menuHeaderBlock}>
                  <View style={styles.menuIntroLine}>
                    <Text style={styles.menuIntroText}>Selecție </Text>
                    <View style={styles.menuBrandMark}>
                      <Text style={styles.menuBrandText}>ONE DINING CLUB</Text>
                      <Star size={10} stroke={colors.red} fill={colors.red} />
                    </View>
                    <Text style={styles.menuIntroText}> {restaurant.name}</Text>
                  </View>
                </View>
                <View style={styles.showcaseList}>
                  {selectedProducts.map((product) => (
                    <ShowcaseProductCard
                      key={product.id}
                      product={product}
                      onPress={() => navigation.navigate("ProductDetails", { restaurant, product })}
                    />
                  ))}
                </View>
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
        <View style={styles.stickyMenuMeta}>
          <Text numberOfLines={1} style={styles.stickyMenuText}>
            {restaurant.estimated_delivery_time_min}-{restaurant.estimated_delivery_time_max} min
          </Text>
        </View>
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
                      <ShowcaseProductCard
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

type ShowcaseProductCardProps = {
  product: Product;
  onPress: () => void;
};

function ShowcaseProductCard({ product, onPress }: ShowcaseProductCardProps) {
  const effectivePrice = product.effective_price ?? product.discount_price ?? product.price;
  const isUnavailable = product.is_available === false;

  return (
    <Pressable
      onPress={onPress}
      disabled={isUnavailable}
      style={({ pressed }) => [
        styles.showcaseCard,
        pressed && styles.showcaseCardPressed,
        isUnavailable && styles.showcaseCardDisabled,
      ]}
    >
      <View style={styles.showcaseImageFrame}>
        <Image
          source={{ uri: resolveImageUri(product.image, FALLBACK_PRODUCT_IMAGE) }}
          style={styles.showcaseImage}
          resizeMode="cover"
        />
        <View style={styles.showcaseImageOverlay} />
        <ShowcaseImageZigZagEdge position="top" />
        <ShowcaseImageZigZagEdge position="bottom" />
      </View>
      <View style={styles.showcaseContent}>
        <View style={styles.showcaseTitleRow}>
          <View style={styles.showcaseNameBadge}>
            <Text numberOfLines={1} style={styles.showcaseName}>
              {product.name}
            </Text>
          </View>
          <View style={styles.showcasePriceCta}>
            <View style={styles.showcasePriceRow}>
              <Text style={styles.showcasePrice}>{money(effectivePrice)}</Text>
            </View>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.showcaseDescription}>
          {product.description}
        </Text>
      </View>
    </Pressable>
  );
}

type ShowcaseImageZigZagEdgeProps = {
  position: "top" | "bottom";
};

function ShowcaseImageZigZagEdge({ position }: ShowcaseImageZigZagEdgeProps) {
  return (
    <Svg
      width="100%"
      height={8}
      viewBox="0 0 280 8"
      preserveAspectRatio="none"
      pointerEvents="none"
      style={[styles.showcaseZigZagEdge, position === "top" ? styles.showcaseZigZagTop : styles.showcaseZigZagBottom]}
    >
      <Path d={position === "top" ? SHOWCASE_ZIG_ZAG_TOP_PATH : SHOWCASE_ZIG_ZAG_BOTTOM_PATH} fill={colors.card} />
    </Svg>
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
    height: 120,
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
  stickyMenuMeta: {
    position: "absolute",
    top: 91,
    left: 72,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stickyMenuText: {
    flexShrink: 1,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
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
  menuSeparator: {
    height: 2,
    marginHorizontal: -18,
    backgroundColor: colors.border,
  },
  menuHeaderBlock: {
    marginBottom: 2,
  },
  menuIntroLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  menuIntroText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "400",
  },
  menuBrandMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  menuBrandText: {
    color: colors.red,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  showcaseList: {
    gap: 22,
  },
  showcaseCard: {
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 0,
  },
  showcaseCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  showcaseCardDisabled: {
    opacity: 0.58,
  },
  showcaseImageFrame: {
    height: 184,
    position: "relative",
    backgroundColor: colors.cardSoft,
  },
  showcaseImage: {
    width: "100%",
    height: "100%",
  },
  showcaseImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  showcaseZigZagEdge: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 2,
  },
  showcaseZigZagTop: {
    top: 0,
  },
  showcaseZigZagBottom: {
    bottom: 0,
  },
  showcaseContent: {
    padding: 14,
    gap: 13,
  },
  showcaseTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  showcaseName: {
    flexShrink: 1,
    color: colors.white,
    fontFamily: "Georgia",
    fontSize: 20,
    lineHeight: 25,
    fontStyle: "italic",
    fontWeight: "400",
  },
  showcaseNameBadge: {
    height: 36,
    flexShrink: 1,
    justifyContent: "center",
    backgroundColor: colors.red,
    paddingHorizontal: 8,
  },
  showcaseDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
  showcasePriceCta: {
    height: 36,
    borderWidth: 2,
    borderRadius: 2,
    borderColor: colors.red,
    backgroundColor: colors.white,
    paddingVertical: 4,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  showcasePriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  showcasePrice: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
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
