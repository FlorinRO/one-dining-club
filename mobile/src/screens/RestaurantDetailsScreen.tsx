import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { ArrowLeft, Heart, Play, Search, Share2, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { restaurantsApi } from "../api/restaurantsApi";
import { RestaurantAvatarImage } from "../components/RestaurantAvatarImage";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { money } from "../lib/format";
import { resolveProductImageUri, resolveRestaurantImageUri } from "../lib/images";
import { HomeStackParamList } from "../navigation/types";
import { useFavoritesStore } from "../store/favoritesStore";
import { colors } from "../theme/colors";
import { Product, Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "RestaurantDetails">;

type ProfileProductTileProps = {
  product: Product;
  restaurant: Restaurant;
  index: number;
  tileSize: number;
  onPress: () => void;
};

const PROFILE_COLUMNS = 3;
const PROFILE_GAP = 2;
const isBrandProfile = (restaurant: Restaurant) => restaurant.entity_type === "brand";
const isSponsoredProfile = (restaurant: Restaurant) => Boolean(restaurant.is_sponsored);

const getVisibleRestaurantProducts = (products: Product[], restaurantId: number) =>
  products.filter((product) => Number(product.restaurant) === restaurantId);
const dark = {
  background: "#050505",
  card: "#111111",
  cardSoft: "#181818",
  border: "rgba(255,255,255,0.12)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.68)",
  faint: "rgba(255,255,255,0.45)",
  success: "#22C55E",
};

const compactCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
};

const videoSourceForProduct = (product: Product): VideoSource | null =>
  product.video_url
    ? {
        uri: product.video_url,
        contentType: "progressive",
        useCaching: true,
      }
    : null;

const buildFallbackProduct = (restaurant: Restaurant): Product => ({
  id: restaurant.id * 10000,
  restaurant: restaurant.id,
  restaurant_name: restaurant.name,
  category: null,
  category_name: "Chef pick",
  name: `${restaurant.name} tasting plate`,
  description: restaurant.description || "Mock video dish prepared for the new swipe-first feed.",
  image: null,
  price: Number(restaurant.minimum_order || 49) || 49,
  discount_price: null,
  effective_price: Number(restaurant.minimum_order || 49) || 49,
  is_available: true,
  is_popular: true,
  preparation_time: restaurant.estimated_delivery_time_min || 20,
  allergens: "",
  option_groups: [],
});

const productViews = (restaurant: Restaurant, product: Product) => {
  const seed = restaurant.id * 53 + product.id * 19;
  return 1800 + (seed % 91) * 173;
};

export function RestaurantDetailsScreen({ navigation, route }: Props) {
  const { tr } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const initialRestaurant = route.params.restaurant;
  const initialProducts = route.params.products;
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();
  const toggleRestaurant = useFavoritesStore((state) => state.toggleRestaurant);
  const isFavorite = useFavoritesStore((state) => state.isRestaurantFavorite(initialRestaurant.id));

  const [restaurant, setRestaurant] = useState<Restaurant>(initialRestaurant);
  const [products, setProducts] = useState<Product[]>(() => getVisibleRestaurantProducts(initialProducts ?? [], initialRestaurant.id));
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const headerTitleProgress = useRef(new Animated.Value(0)).current;
  const searchOverlayProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    restaurantsApi.detail(initialRestaurant.id).then((nextRestaurant) => {
      if (isMounted) setRestaurant(nextRestaurant);
    });
    if (initialProducts?.length) {
      setProducts(getVisibleRestaurantProducts(initialProducts, initialRestaurant.id));
    }
    restaurantsApi.products(initialRestaurant.id).then((nextProducts) => {
      if (isMounted) setProducts(getVisibleRestaurantProducts(nextProducts, initialRestaurant.id));
    });

    return () => {
      isMounted = false;
    };
  }, [initialProducts, initialRestaurant.id]);

  const profileProducts = useMemo(() => {
    const restaurantProducts = getVisibleRestaurantProducts(products, restaurant.id);
    return restaurantProducts.length ? restaurantProducts : [buildFallbackProduct(restaurant)];
  }, [products, restaurant]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return profileProducts;

    return profileProducts.filter((product) =>
      `${product.name} ${product.description} ${product.category_name ?? ""}`.toLowerCase().includes(query),
    );
  }, [profileProducts, searchQuery]);

  const tileSize = Math.floor((width - PROFILE_GAP * (PROFILE_COLUMNS - 1)) / PROFILE_COLUMNS);
  const likeCount = profileProducts.reduce((total, product) => total + productViews(restaurant, product), 0);
  const restaurantHandle = `@${restaurant.slug || restaurant.name.toLowerCase().replace(/\s+/g, "")}`;
  const restaurantBackdropUri = resolveRestaurantImageUri(restaurant.logo || restaurant.cover_image, restaurant.id, restaurant);
  const isBrand = isBrandProfile(restaurant);
  const isSponsored = isSponsoredProfile(restaurant);

  const shareRestaurant = useCallback(async () => {
    await Share.share({
      title: restaurant.name,
      message: `${restaurant.name}\n${restaurant.description}`,
    });
  }, [restaurant]);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
    Animated.timing(searchOverlayProgress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    setTimeout(() => searchInputRef.current?.focus(), 120);
  }, [searchOverlayProgress]);

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    Animated.timing(searchOverlayProgress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setIsSearchOpen(false);
      setSearchQuery("");
      setIsSearchFocused(false);
    });
  }, [searchOverlayProgress]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      trackFloatingCartScrollDirection(event);
    },
    [trackFloatingCartScrollDirection],
  );

  const renderProduct = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <ProfileProductTile
        product={item}
        restaurant={restaurant}
        index={index}
        tileSize={tileSize}
        onPress={() => navigation.navigate("ProductDetails", { restaurant, product: item })}
      />
    ),
    [navigation, restaurant, tileSize],
  );

  const listHeader = (
    <View style={[styles.profileHeader, { paddingTop: insets.top + 76 }]}>

      <View style={styles.identityStack}>
        <View style={styles.avatarRing}>
          <RestaurantAvatarImage restaurant={restaurant} style={styles.avatar} />
        </View>
        <View style={styles.identityCopy}>
          {isSponsored ? (
            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>{tr("Sponsorizat", "Sponsored")}</Text>
            </View>
          ) : null}
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text numberOfLines={1} style={styles.restaurantHandle}>{restaurantHandle}</Text>
          <Text numberOfLines={1} style={styles.restaurantMeta}>
            {isBrand
              ? tr("Brand partner · produse promovate disponibile la comandă", "Partner brand · promoted products available to order")
              : `${Number(restaurant.rating).toFixed(1)} ★ · ${restaurant.estimated_delivery_time_min}-${restaurant.estimated_delivery_time_max} min · ${money(restaurant.delivery_fee)} livrare`}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <ProfileStat value={String(profileProducts.length)} label={tr(isBrand ? "Drop-uri" : "Produse", isBrand ? "Drops" : "Products")} />
        <ProfileStat value={compactCount(likeCount)} label={tr("Vizualizări", "Views")} />
        <ProfileStat value={Number(restaurant.rating).toFixed(1)} label={tr("Rating", "Rating")} />
      </View>

      <Text style={styles.bioText}>{restaurant.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: restaurantBackdropUri }}
        style={styles.backgroundImage}
        resizeMode="cover"
        blurRadius={24}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(5,5,5,0.34)", "rgba(5,5,5,0.58)", "rgba(5,5,5,0.86)"]}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.FlatList
        data={profileProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProduct}
        numColumns={PROFILE_COLUMNS}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 104 }]}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: headerTitleProgress } } }],
          { useNativeDriver: true, listener: handleScroll },
        )}
        scrollEventThrottle={16}
      />

      <View style={[styles.topControls, { paddingTop: insets.top + 8 }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.topControlsBackdrop,
            {
              opacity: headerTitleProgress.interpolate({
                inputRange: [12, 56],
                outputRange: [0, 1],
                extrapolate: "clamp",
              }),
            },
          ]}
        />
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft stroke={dark.text} size={22} />
        </Pressable>
        <Animated.Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.topTitle,
            {
              opacity: headerTitleProgress.interpolate({
                inputRange: [44, 90],
                outputRange: [0, 1],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateY: headerTitleProgress.interpolate({
                    inputRange: [44, 90],
                    outputRange: [8, 0],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          {restaurant.name}
        </Animated.Text>
        <View style={styles.topRightControls}>
          <Pressable onPress={shareRestaurant} style={styles.iconButton}>
            <Share2 stroke={dark.text} size={20} />
          </Pressable>
          <Pressable onPress={() => toggleRestaurant(restaurant.id)} style={styles.iconButton}>
            <Heart stroke={isFavorite ? colors.red : dark.text} fill={isFavorite ? colors.red : "transparent"} size={20} />
          </Pressable>
          <Pressable onPress={openSearch} style={styles.iconButton}>
            <Search stroke={dark.text} size={20} />
          </Pressable>
        </View>
      </View>

      {isSearchOpen ? (
        <Animated.View
          style={[
            styles.searchOverlay,
            {
              opacity: searchOverlayProgress,
              transform: [
                {
                  translateY: searchOverlayProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.searchHeader, { paddingTop: insets.top + 12 }]}>
            <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
              <Search stroke={dark.muted} size={18} />
              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder={tr("Caută în acest profil", "Search this profile")}
                placeholderTextColor={dark.faint}
                style={styles.searchInput}
                autoFocus
                returnKeyType="search"
              />
            </View>
            <Pressable onPress={closeSearch} style={styles.searchCloseButton}>
              <X stroke={dark.text} size={18} />
            </Pressable>
          </View>
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => `search-${item.id}`}
            renderItem={renderProduct}
            numColumns={PROFILE_COLUMNS}
            ListHeaderComponent={(
              <View style={styles.searchResultHeader}>
                <Text style={styles.searchResultText}>
                  {filteredProducts.length} rezultat{filteredProducts.length === 1 ? "" : "e"}
                </Text>
              </View>
            )}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[styles.searchGridContent, { paddingBottom: insets.bottom + 42 }]}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function ProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function VideoSkeletonBuffer() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 760,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 760,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 0.86],
  });

  return (
    <View pointerEvents="none" style={styles.tileSkeleton}>
      <Animated.View style={[styles.tileSkeletonGlow, { opacity }]} />
      <View style={styles.tileSkeletonTopPill} />
      <View style={styles.tileSkeletonCaption}>
        <Animated.View style={[styles.tileSkeletonLine, { opacity }]} />
        <Animated.View style={[styles.tileSkeletonLineShort, { opacity }]} />
      </View>
    </View>
  );
}

function ProfileProductTile({ product, restaurant, index, tileSize, onPress }: ProfileProductTileProps) {
  const videoSource = useMemo(() => videoSourceForProduct(product), [product]);
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false);
  const price = product.effective_price ?? product.discount_price ?? product.price;
  const posterUri = useMemo(
    () => resolveProductImageUri(product.image, product.id) || resolveRestaurantImageUri(restaurant.cover_image, restaurant.id, restaurant),
    [product.id, product.image, restaurant],
  );
  const player = useVideoPlayer(videoSource, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.volume = 0;
    videoPlayer.audioMixingMode = "mixWithOthers";
  });

  useEffect(() => {
    if (!videoSource) {
      return undefined;
    }

    try {
      player.play();
    } catch {
      // Tile thumbnails stay tappable even if a preview fails to autoplay.
    }

    return () => {
      try {
        player.pause();
      } catch {
        // Ignore preview cleanup failures from native video state.
      }
    };
  }, [player, videoSource]);

  useEffect(() => {
    setHasRenderedFrame(false);
  }, [videoSource]);

  return (
    <Pressable onPress={onPress} style={[styles.tile, { width: tileSize, height: Math.round(tileSize * 1.38) }]}>
      {videoSource ? (
        <>
          <VideoView
            player={player}
            style={styles.tileVideo}
            contentFit="cover"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture={false}
            playsInline
            pointerEvents="none"
            surfaceType="textureView"
            useExoShutter={false}
            onFirstFrameRender={() => setHasRenderedFrame(true)}
          />
          {!hasRenderedFrame ? <VideoSkeletonBuffer /> : null}
        </>
      ) : (
        <Image source={{ uri: posterUri }} style={styles.tileVideo} resizeMode="cover" />
      )}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.24)", "rgba(0,0,0,0.56)"]}
        locations={[0, 0.45, 1]}
        style={styles.tileGradient}
      />
      <View style={styles.tileTopBadge}>
        <Play size={10} stroke={dark.text} fill={dark.text} />
        <Text style={styles.tileViews}>{compactCount(productViews(restaurant, product))}</Text>
      </View>
      <View style={styles.tileCaption}>
        <Text numberOfLines={2} style={styles.tileName}>{product.name}</Text>
        <Text numberOfLines={1} style={styles.tilePrice}>{money(price)}</Text>
        <View style={styles.tilePriceAccent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark.background,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  gridContent: {
    backgroundColor: "transparent",
  },
  gridRow: {
    gap: PROFILE_GAP,
    marginBottom: PROFILE_GAP,
  },
  profileHeader: {
    paddingHorizontal: 18,
    paddingBottom: 0,
  },
  identityStack: {
    alignItems: "center",
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    marginBottom: 16,
    backgroundColor: dark.text,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
    backgroundColor: dark.cardSoft,
  },
  identityCopy: {
    width: "100%",
    gap: 3,
    alignItems: "center",
  },
  profileBadge: {
    marginBottom: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  profileBadgeText: {
    color: dark.text,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  restaurantName: {
    color: dark.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    textAlign: "center",
  },
  restaurantHandle: {
    color: dark.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  restaurantMeta: {
    color: dark.faint,
    fontSize: 12,
    fontWeight: "700",
  },
  statsRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    minWidth: 86,
    alignItems: "center",
  },
  statValue: {
    color: dark.text,
    fontSize: 18,
    fontWeight: "600",
  },
  statLabel: {
    marginTop: 3,
    color: dark.faint,
    fontSize: 12,
    fontWeight: "700",
  },
  bioText: {
    marginTop: 18,
    marginBottom: 36,
    color: dark.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  shareIconButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 8,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "transparent",
  },
  topControlsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: dark.background,
  },
  topTitle: {
    flex: 1,
    color: dark.text,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  topRightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 144,
    justifyContent: "flex-end",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  tile: {
    overflow: "hidden",
    backgroundColor: dark.card,
  },
  tileVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  tileSkeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#101012",
    overflow: "hidden",
  },
  tileSkeletonGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  tileSkeletonTopPill: {
    position: "absolute",
    left: 8,
    top: 8,
    width: 54,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  tileSkeletonCaption: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 9,
    gap: 6,
  },
  tileSkeletonLine: {
    width: "82%",
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  tileSkeletonLineShort: {
    width: "48%",
    height: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  tileGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 92,
  },
  tileTopBadge: {
    position: "absolute",
    left: 7,
    top: 7,
    minHeight: 20,
    borderRadius: 999,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.36)",
  },
  tileViews: {
    color: dark.text,
    fontSize: 11,
    fontWeight: "600",
  },
  tileCaption: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    gap: 2,
  },
  tileName: {
    color: dark.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  tilePrice: {
    color: dark.text,
    fontSize: 12,
    fontWeight: "700",
  },
  tilePriceAccent: {
    width: 26,
    height: 2,
    borderRadius: 999,
    backgroundColor: dark.success,
    marginTop: 2,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: dark.background,
  },
  searchHeader: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
    backgroundColor: dark.background,
  },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: dark.cardSoft,
    borderWidth: 1,
    borderColor: dark.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBarFocused: {
    borderColor: dark.success,
  },
  searchInput: {
    flex: 1,
    color: dark.text,
    fontSize: 14,
    fontWeight: "500",
  },
  searchCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: dark.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  searchGridContent: {
    backgroundColor: dark.background,
  },
  searchResultHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchResultText: {
    color: dark.muted,
    fontSize: 13,
    fontWeight: "500",
  },
});
