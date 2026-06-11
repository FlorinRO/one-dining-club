import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import { useEvent, useEventListener } from "expo";
import { type AudioSource, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import {
  Globe,
  Heart,
  MapPin,
  MessageSquare,
  Repeat2,
  ShoppingBag,
  UtensilsCrossed,
  Volume2,
  VolumeX,
} from "lucide-react-native";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { addressesApi } from "../api/addressesApi";
import { productsApi } from "../api/productsApi";
import { restaurantsApi } from "../api/restaurantsApi";
import { ProductCommentsSheet } from "../components/ProductCommentsSheet";
import { RestaurantAvatarImage } from "../components/RestaurantAvatarImage";
import { getDemoProductAudioSource } from "../data/demoAudio";
import { mockProducts } from "../data/mockData";
import { useI18n } from "../i18n/useI18n";
import { compactCount, productKey, statsFor } from "../lib/feedSocial";
import { money } from "../lib/format";
import { buildSponsoredFeed, isExternalSponsoredPlacement, isSponsoredFeedPlacement } from "../lib/sponsoredFeed";
import { HomeStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { useCommentsStore } from "../store/commentsStore";
import { colors } from "../theme/colors";
import { Address, Product, Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

type FeedRestaurant = {
  restaurant: Restaurant;
  products: Product[];
  initialProductIndex: number;
};

const isBrandAccount = (restaurant: Restaurant) => restaurant.entity_type === "brand";
const sponsoredDestinationFor = (restaurant: Restaurant, product?: Product) =>
  product?.external_url || restaurant.website_url || null;

const FEED_STANDALONE_AUDIO_VOLUME = 0.82;
const FEED_VIDEO_LOAD_TIMEOUT_MS = 12000;
const FEED_VIDEO_DEBUG = false;
const logFeedVideo = (...args: Parameters<typeof console.log>) => {
  if (FEED_VIDEO_DEBUG) console.log(...args);
};

const feedVideoSourceForProduct = (product: Product): VideoSource | null =>
  product.video_url
    ? {
        uri: product.video_url,
        contentType: "progressive",
        useCaching: true,
      }
    : null;

const videoSourceCacheKey = (source: VideoSource) =>
  typeof source === "object" && source?.uri ? source.uri : JSON.stringify(source);

const buildFallbackProduct = (restaurant: Restaurant): Product => ({
  id: restaurant.id * 10000,
  restaurant: restaurant.id,
  restaurant_name: restaurant.name,
  external_url: restaurant.website_url ?? null,
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

const hasServerSocial = (product: Product) =>
  typeof product.likes_count === "number" ||
  typeof product.comments_count === "number" ||
  typeof product.is_liked === "boolean";

export function HomeScreen({ navigation }: Props) {
  const { tr } = useI18n();
  const isHomeFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const accessToken = useAuthStore((state) => state.accessToken);
  const cartItemsCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [productsByRestaurant, setProductsByRestaurant] = useState<Record<number, Product[]>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const commentBumps = useCommentsStore((state) => state.commentBumps);
  const [activeRestaurantIndex, setActiveRestaurantIndex] = useState(0);
  const [activeProductByRestaurant, setActiveProductByRestaurant] = useState<Record<number, number>>({});
  const [audiblePostKey, setAudiblePostKey] = useState<string | null>(null);
  const [hasAutoSelectedAudiblePost, setHasAutoSelectedAudiblePost] = useState(false);
  const [isFeedAudioMutedByUser, setIsFeedAudioMutedByUser] = useState(false);
  const [feedHeight, setFeedHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPreparedInitialVideo, setHasPreparedInitialVideo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [commentsSheetPost, setCommentsSheetPost] = useState<{ restaurant: Restaurant; product: Product } | null>(null);

  const pageHeight = feedHeight || screenHeight;

  const fetchFeed = useCallback(async () => {
    const restaurantItems = await restaurantsApi.list({ ordering: "-rating" });
    const openRestaurants = restaurantItems.filter((item) => item.is_open !== false);
    const visibleRestaurants = buildSponsoredFeed(openRestaurants, 12);
    setRestaurants(visibleRestaurants);

    const productEntries = await Promise.all(
      visibleRestaurants.map(async (restaurant) => {
        const apiProducts = await restaurantsApi.products(restaurant.id);
        const sponsoredMockProducts = mockProducts.filter((product) => Number(product.restaurant) === restaurant.id);
        const products =
          isSponsoredFeedPlacement(restaurant) && sponsoredMockProducts.length > 0
            ? sponsoredMockProducts
            : apiProducts.length > 0
              ? apiProducts
              : sponsoredMockProducts;
        const limitedProducts = isSponsoredFeedPlacement(restaurant) ? products.slice(0, 1) : products.slice(0, 3);
        return [restaurant.id, limitedProducts] as const;
      }),
    );

    setProductsByRestaurant(Object.fromEntries(productEntries));
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchFeed()
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fetchFeed]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFeed();
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  }, [fetchFeed]);

  const feedData = useMemo<FeedRestaurant[]>(() => {
    return restaurants.map((restaurant, restaurantIndex) => {
      const products = (productsByRestaurant[restaurant.id] ?? []).filter((product) => Number(product.restaurant) === restaurant.id);
      const resolvedProducts = products.length ? products : [buildFallbackProduct(restaurant)];
      return {
        restaurant,
        products: resolvedProducts,
        initialProductIndex: 0,
      };
    });
  }, [productsByRestaurant, restaurants]);

  const loadCurrentLocationLabel = useCallback(async () => {
    if (!accessToken) {
      setLocationLabel("");
      return;
    }

    try {
      const addresses = await addressesApi.list();
      const normalize = (value: string) => value.trim().toLowerCase();
      const isAutoLabel = (label: string) => {
        const text = normalize(label);
        return text.includes("loca") || text.includes("automat") || text.includes("auto");
      };
      const defaultAddress = addresses.find((item) => item.is_default);
      const autoAddress = addresses.find((item) => isAutoLabel(item.label));
      const resolvedAddress: Address | undefined = defaultAddress ?? autoAddress ?? addresses[0];

      if (!resolvedAddress) {
        setLocationLabel("");
        return;
      }

      const nextLabel = [resolvedAddress.address_line_1, resolvedAddress.city].filter(Boolean).join(", ");
      setLocationLabel(nextLabel);
    } catch {
      setLocationLabel("");
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isHomeFocused) return;
    void loadCurrentLocationLabel();
  }, [isHomeFocused, loadCurrentLocationLabel]);

  const activeFeedItem = feedData[activeRestaurantIndex];
  const activeFeedProductIndex = activeFeedItem
    ? activeProductByRestaurant[activeFeedItem.restaurant.id] ?? activeFeedItem.initialProductIndex
    : 0;
  const activeFeedProduct = activeFeedItem?.products[
    Math.min(Math.max(activeFeedProductIndex, 0), Math.max(activeFeedItem.products.length - 1, 0))
  ];
  const activePostKey = activeFeedItem && activeFeedProduct
    ? productKey(activeFeedItem.restaurant.id, activeFeedProduct.id)
    : null;
  const activeFeedVideoSource = useMemo(
    () =>
      activeFeedItem && activeFeedProduct
        ? feedVideoSourceForProduct(activeFeedProduct)
        : null,
    [activeFeedItem, activeFeedProduct],
  );
  const preloadVideoSources = useMemo(() => {
    if (!isHomeFocused || !activeFeedItem) return [];

    const sources: VideoSource[] = [];
    const currentRestaurantBaseIndex = (activeFeedItem.restaurant.id - 1) * 10;
    const currentProductIndexes = [
      activeFeedProductIndex + 1,
      activeFeedProductIndex - 1,
    ];

    currentProductIndexes.forEach((productIndex) => {
      const product = activeFeedItem.products[productIndex];
      if (product) {
        const source = feedVideoSourceForProduct(product);
        if (source) {
          sources.push(source);
        }
      }
    });

    const nextFeedItem = feedData[activeRestaurantIndex + 1];
    if (nextFeedItem) {
      const nextProductIndex = activeProductByRestaurant[nextFeedItem.restaurant.id] ?? nextFeedItem.initialProductIndex;
      const nextProduct = nextFeedItem.products[Math.min(Math.max(nextProductIndex, 0), Math.max(nextFeedItem.products.length - 1, 0))];
      if (nextProduct) {
        const source = feedVideoSourceForProduct(nextProduct);
        if (source) {
          sources.push(source);
        }
      }
    }

    const seen = new Set<string>();
    return sources.filter((source) => {
      const key = videoSourceCacheKey(source);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [activeFeedItem, activeFeedProductIndex, activeProductByRestaurant, activeRestaurantIndex, feedData, isHomeFocused]);

  const restaurantViewabilityConfig = useRef({ itemVisiblePercentThreshold: 65 }).current;
  const onRestaurantViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken<FeedRestaurant>> }) => {
      const next = viewableItems.find((token) => token.isViewable && token.index != null);
      if (next?.index != null) {
        setActiveRestaurantIndex(next.index);
      }
    },
  ).current;

  const shareProduct = useCallback(async (restaurant: Restaurant, product: Product) => {
    await Share.share({
      title: product.name,
      message: `${product.name} de la ${restaurant.name} · ${money(product.effective_price ?? product.discount_price ?? product.price)}`,
    });
  }, []);

  const openSponsoredDestination = useCallback(async (restaurant: Restaurant, product?: Product) => {
    const url = sponsoredDestinationFor(restaurant, product);
    if (!url) return;

    try {
      await Linking.openURL(url);
    } catch {
      // Ignore external-link failures to keep the feed responsive.
    }
  }, []);

  const quickAdd = useCallback(
    (restaurant: Restaurant, product: Product) => {
      if (isExternalSponsoredPlacement(restaurant)) {
        void openSponsoredDestination(restaurant, product);
        return;
      }
      navigation.navigate("ProductDetails", { restaurant, product });
    },
    [navigation, openSponsoredDestination],
  );

  const updateProductSocial = useCallback(
    (restaurantId: number, productId: number, patch: Partial<Pick<Product, "likes_count" | "comments_count" | "is_liked">>) => {
      setProductsByRestaurant((current) => {
        const restaurantProducts = current[restaurantId];
        if (!restaurantProducts) return current;

        return {
          ...current,
          [restaurantId]: restaurantProducts.map((item) => (item.id === productId ? { ...item, ...patch } : item)),
        };
      });
    },
    [],
  );

  const toggleLike = useCallback((restaurant: Restaurant, product: Product) => {
    const key = productKey(restaurant.id, product.id);
    const isServerBacked = hasServerSocial(product);
    const currentLiked = typeof product.is_liked === "boolean" ? product.is_liked : Boolean(likedPosts[key]);
    const nextLiked = !currentLiked;

    if (!isServerBacked) {
      setLikedPosts((current) => ({ ...current, [key]: !current[key] }));
      void Haptics.selectionAsync();
      return;
    }

    const currentCount = typeof product.likes_count === "number" ? product.likes_count : 0;
    updateProductSocial(restaurant.id, product.id, {
      is_liked: nextLiked,
      likes_count: Math.max(0, currentCount + (nextLiked ? 1 : -1)),
    });

    productsApi
      .toggleLike(product.id)
      .then((summary) => {
        updateProductSocial(restaurant.id, product.id, {
          is_liked: summary.is_liked,
          likes_count: summary.likes_count,
          comments_count: summary.comments_count,
        });
      })
      .catch(() => {
        updateProductSocial(restaurant.id, product.id, {
          is_liked: currentLiked,
          likes_count: currentCount,
        });
      });
    void Haptics.selectionAsync();
  }, [likedPosts, updateProductSocial]);

  const openCommentsSheet = useCallback((restaurant: Restaurant, product: Product) => {
    setCommentsSheetPost({ restaurant, product });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);
  const markInitialVideoPrepared = useCallback(() => {
    setHasPreparedInitialVideo((current) => (current ? current : true));
  }, []);

  useEffect(() => {
    if (!isHomeFocused) {
      setAudiblePostKey(null);
      return;
    }

    if (!activePostKey) {
      setAudiblePostKey(null);
      return;
    }

    if (isFeedAudioMutedByUser) return;

    if (!hasAutoSelectedAudiblePost) {
      setAudiblePostKey(activePostKey);
      setHasAutoSelectedAudiblePost(true);
      return;
    }

    setAudiblePostKey((current) => (current === activePostKey ? current : activePostKey));
  }, [activePostKey, hasAutoSelectedAudiblePost, isFeedAudioMutedByUser, isHomeFocused]);

  useEffect(() => {
    if (!activeFeedVideoSource || hasPreparedInitialVideo) return undefined;

    const timeoutId = setTimeout(() => {
      markInitialVideoPrepared();
    }, 1800);

    return () => clearTimeout(timeoutId);
  }, [activeFeedVideoSource, hasPreparedInitialVideo, markInitialVideoPrepared]);

  if ((isLoading && !feedData.length) || (activeFeedVideoSource && !hasPreparedInitialVideo)) {
    return (
      <View style={styles.loadingScreen}>
        {activeFeedVideoSource ? (
          <FeedVideoPreloader source={activeFeedVideoSource} onReady={markInitialVideoPrepared} />
        ) : null}
        <View style={styles.loadingLogoWrap}>
          <Text style={styles.loadingLogoText}>
            Yumz<Text style={styles.loadingLogoTextAccent}>Y</Text>
          </Text>
          <View style={styles.loadingLogoUnderlineRow}>
            <View style={styles.loadingLogoUnderlineGreen} />
            <View style={styles.loadingLogoUnderlineWhite} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const nextHeight = event.nativeEvent.layout.height;
        if (nextHeight > 0 && Math.abs(nextHeight - feedHeight) > 1) {
          setFeedHeight(nextHeight);
        }
      }}
    >
      <FlatList
        data={feedData}
        keyExtractor={(item) => String(item.restaurant.id)}
        renderItem={({ item, index }) => (
          <RestaurantFeedPage
            item={item}
            pageHeight={pageHeight}
            pageWidth={screenWidth}
            isActive={index === activeRestaurantIndex}
            isScreenFocused={isHomeFocused}
            isRestaurantAudible={Boolean(audiblePostKey?.startsWith(`${item.restaurant.id}:`))}
            activeProductIndex={activeProductByRestaurant[item.restaurant.id] ?? item.initialProductIndex}
            audiblePostKey={audiblePostKey}
            likedPosts={likedPosts}
            commentBumps={commentBumps}
            onProductIndexChange={(productIndex) => {
              setActiveProductByRestaurant((current) => ({ ...current, [item.restaurant.id]: productIndex }));
            }}
            onOpenRestaurant={() => {
              if (isExternalSponsoredPlacement(item.restaurant)) {
                void openSponsoredDestination(item.restaurant, item.products[0]);
                return;
              }
              navigation.navigate("RestaurantDetails", { restaurant: item.restaurant, products: item.products });
            }}
            onOpenProduct={(product, productIndex) => {
              if (isExternalSponsoredPlacement(item.restaurant)) {
                void openSponsoredDestination(item.restaurant, product);
                return;
              }
              navigation.navigate("ProductDetails", {
                restaurant: item.restaurant,
                product,
              });
            }}
            onQuickAdd={(product) => quickAdd(item.restaurant, product)}
            onLike={(product) => toggleLike(item.restaurant, product)}
            onComment={(product) => openCommentsSheet(item.restaurant, product)}
            onShare={(product) => shareProduct(item.restaurant, product)}
            cartItemsCount={cartItemsCount}
            onOpenCart={() => navigation.navigate("CartFlow", { screen: "CartHome" })}
            onAudioChange={(key, shouldEnableAudio) => {
              setIsFeedAudioMutedByUser(!shouldEnableAudio);
              setAudiblePostKey(shouldEnableAudio ? key : null);
            }}
          />
        )}
        pagingEnabled
        directionalLockEnabled
        snapToInterval={pageHeight}
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        viewabilityConfig={restaurantViewabilityConfig}
        onViewableItemsChanged={onRestaurantViewableItemsChanged}
        getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.white} />}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.y / pageHeight);
          if (nextIndex !== activeRestaurantIndex && nextIndex >= 0 && nextIndex < feedData.length) {
            setActiveRestaurantIndex(nextIndex);
          }
        }}
        scrollEventThrottle={16}
        removeClippedSubviews={false}
      />
      {preloadVideoSources.map((source, index) => (
        <FeedVideoPreloader key={`feed-preloader-${index}-${videoSourceCacheKey(source)}`} source={source} />
      ))}
      <Pressable
        style={[styles.locationChip, { top: insets.top + 20 }]}
        onPress={() => navigation.navigate("DeliveryAddress")}
      >
        <MapPin size={15} stroke={colors.white} />
        <Text numberOfLines={1} style={styles.locationChipText}>
          {locationLabel || tr("Setează locația", "Set location")}
        </Text>
      </Pressable>
      {!isSponsoredFeedPlacement(activeFeedItem?.restaurant ?? ({} as Restaurant)) ? (
        <View pointerEvents="none" style={styles.feedTopProductPagers}>
          {Array.from({ length: Math.min(activeFeedItem?.products.length ?? 0, 10) }).map((_, dotIndex) => (
            <View
              key={dotIndex}
              style={[
                styles.feedTopProductDot,
                dotIndex === activeFeedProductIndex && styles.feedTopProductDotActive,
              ]}
            />
          ))}
        </View>
      ) : null}
      <ProductCommentsSheet
        visible={Boolean(commentsSheetPost)}
        restaurant={commentsSheetPost?.restaurant ?? null}
        product={commentsSheetPost?.product ?? null}
        onClose={() => setCommentsSheetPost(null)}
        onProductSocialChange={(productId, patch) => {
          if (commentsSheetPost) {
            updateProductSocial(commentsSheetPost.restaurant.id, productId, patch);
          }
        }}
      />
    </View>
  );
}

type RestaurantFeedPageProps = {
  item: FeedRestaurant;
  pageHeight: number;
  pageWidth: number;
  isActive: boolean;
  isScreenFocused: boolean;
  isRestaurantAudible: boolean;
  activeProductIndex: number;
  audiblePostKey: string | null;
  likedPosts: Record<string, boolean>;
  commentBumps: Record<string, number>;
  onProductIndexChange: (index: number) => void;
  onOpenRestaurant: () => void;
  onOpenProduct: (product: Product, index: number) => void;
  onQuickAdd: (product: Product, index: number) => void;
  onLike: (product: Product) => void;
  onComment: (product: Product) => void;
  onShare: (product: Product) => void;
  cartItemsCount: number;
  onOpenCart: () => void;
  onAudioChange: (key: string, shouldEnableAudio: boolean) => void;
};

function RestaurantFeedPage({
  item,
  pageHeight,
  pageWidth,
  isActive,
  isScreenFocused,
  isRestaurantAudible,
  activeProductIndex,
  audiblePostKey,
  likedPosts,
  commentBumps,
  onProductIndexChange,
  onOpenRestaurant,
  onOpenProduct,
  onQuickAdd,
  onLike,
  onComment,
  onShare,
  cartItemsCount,
  onOpenCart,
  onAudioChange,
}: RestaurantFeedPageProps) {
  const productListRef = useRef<FlatList<Product>>(null);
  const productViewabilityConfig = useRef({ itemVisiblePercentThreshold: 65 }).current;
  const clampedActiveProductIndex = Math.min(Math.max(activeProductIndex, 0), item.products.length - 1);
  const hasRestaurantAudio = true;
  const restaurantAudioSource = useMemo<AudioSource>(
    () => getDemoProductAudioSource(item.restaurant.id - 1),
    [item.restaurant.id],
  );
  const restaurantAudioPlayer = useAudioPlayer(restaurantAudioSource, {
    updateInterval: 1000,
    keepAudioSessionActive: true,
  });
  const restaurantAudioStatus = useAudioPlayerStatus(restaurantAudioPlayer);
  const onProductViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken<Product>> }) => {
      const next = viewableItems.find((token) => token.isViewable && token.index != null);
      if (next?.index != null) {
        onProductIndexChange(next.index);
      }
    },
  ).current;

  useEffect(() => {
    productListRef.current?.scrollToIndex({ index: clampedActiveProductIndex, animated: false });
  }, [clampedActiveProductIndex]);

  useEffect(() => {
    const shouldPlay = isScreenFocused && isActive && isRestaurantAudible;
    try {
      restaurantAudioPlayer.loop = true;
      restaurantAudioPlayer.volume = shouldPlay ? FEED_STANDALONE_AUDIO_VOLUME : 0;
      restaurantAudioPlayer.muted = !shouldPlay;
      if (shouldPlay) {
        if (!restaurantAudioStatus.playing) {
          restaurantAudioPlayer.play();
        }
      } else if (restaurantAudioStatus.playing) {
        restaurantAudioPlayer.pause();
      }
    } catch {
      // Keep feed usable even if audio player state fails to update.
    }
  }, [
    isActive,
    isScreenFocused,
    isRestaurantAudible,
    restaurantAudioPlayer,
    restaurantAudioStatus.playing,
  ]);

  const handleStepProduct = useCallback(
    (direction: "prev" | "next") => {
      const nextIndex = direction === "prev"
        ? Math.max(clampedActiveProductIndex - 1, 0)
        : Math.min(clampedActiveProductIndex + 1, item.products.length - 1);

      if (nextIndex === clampedActiveProductIndex) return;
      onProductIndexChange(nextIndex);
      productListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    },
    [clampedActiveProductIndex, item.products.length, onProductIndexChange],
  );

  return (
    <View
      style={[styles.page, { width: pageWidth, height: pageHeight }]}
    >
      <FlatList
        ref={productListRef}
        horizontal
        data={item.products}
        keyExtractor={(product) => String(product.id)}
        renderItem={({ item: product, index }) => {
          const key = productKey(item.restaurant.id, product.id);
          const isSlideActive = isActive && index === clampedActiveProductIndex;
          const isProductLiked = typeof product.is_liked === "boolean" ? product.is_liked : Boolean(likedPosts[key]);
          return (
            <ProductVideoSlide
              restaurant={item.restaurant}
              product={product}
              index={index}
              width={pageWidth}
              height={pageHeight}
              isActive={isSlideActive}
              isAudible={audiblePostKey === key && isSlideActive}
              hasRestaurantAudio={hasRestaurantAudio}
              isRestaurantAudioActive={isRestaurantAudible}
              isLiked={isProductLiked}
              commentBump={commentBumps[key] ?? 0}
              onOpenRestaurant={onOpenRestaurant}
              onOpenProduct={() => onOpenProduct(product, index)}
              onStepProduct={handleStepProduct}
              onQuickAdd={() => onQuickAdd(product, index)}
              onLike={() => onLike(product)}
              onComment={() => onComment(product)}
              onShare={() => onShare(product)}
              cartItemsCount={cartItemsCount}
              onOpenCart={onOpenCart}
              onAudioChange={(shouldEnableAudio) => onAudioChange(key, shouldEnableAudio)}
            />
          );
        }}
        pagingEnabled
        directionalLockEnabled
        snapToInterval={pageWidth}
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        viewabilityConfig={productViewabilityConfig}
        onViewableItemsChanged={onProductViewableItemsChanged}
        getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={false}
      />
    </View>
  );
}

type ProductVideoSlideProps = {
  restaurant: Restaurant;
  product: Product;
  index: number;
  width: number;
  height: number;
  isActive: boolean;
  isAudible: boolean;
  hasRestaurantAudio: boolean;
  isRestaurantAudioActive: boolean;
  isLiked: boolean;
  commentBump: number;
  onOpenRestaurant: () => void;
  onOpenProduct: () => void;
  onStepProduct: (direction: "prev" | "next") => void;
  onQuickAdd: () => void;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  cartItemsCount: number;
  onOpenCart: () => void;
  onAudioChange: (shouldEnableAudio: boolean) => void;
};

type LikeBurstHeart = {
  id: number;
  xOffset: number;
  size: number;
  duration: number;
  delay: number;
  rotate: string;
};

type PersistentLikeHeart = {
  id: number;
  xOffset: number;
  yOffset: number;
  size: number;
  delay: number;
};

function FeedVideoPreloader({ source, onReady }: { source: VideoSource; onReady?: () => void }) {
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = true;
    videoPlayer.volume = 0;
    videoPlayer.audioMixingMode = "mixWithOthers";
    videoPlayer.bufferOptions = {
      preferredForwardBufferDuration: 2,
      minBufferForPlayback: 0.2,
      maxBufferBytes: 4 * 1024 * 1024,
      prioritizeTimeOverSizeThreshold: true,
    };
  });

  useEventListener(player, "sourceLoad", () => {
    onReady?.();
  });

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay") {
      onReady?.();
    }
  });

  useEffect(() => {
    let pauseTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      const playResult = player.play() as unknown;
      pauseTimeout = setTimeout(() => {
        try {
          player.pause();
        } catch {
          // Ignore preloader pause failures.
        }
      }, 900);

      if (playResult && typeof (playResult as Promise<void>).catch === "function") {
        void (playResult as Promise<void>).catch(() => {
          // Preloading is best-effort; the visible player will still handle playback.
        });
      }
    } catch {
      // Preloading is best-effort.
    }

    return () => {
      if (pauseTimeout) clearTimeout(pauseTimeout);
      try {
        player.pause();
      } catch {
        // Ignore preloader cleanup failures.
      }
    };
  }, [player]);

  return null;
}

const PERSISTENT_LIKE_HEARTS: PersistentLikeHeart[] = [
  { id: 1, xOffset: -14, yOffset: -3, size: 10, delay: 0 },
  { id: 2, xOffset: 0, yOffset: -10, size: 11, delay: 180 },
  { id: 3, xOffset: 14, yOffset: -3, size: 10, delay: 360 },
];

function ProductVideoSlide({
  restaurant,
  product,
  index,
  width,
  height,
  isActive,
  isAudible,
  hasRestaurantAudio,
  isRestaurantAudioActive,
  isLiked,
  commentBump,
  onOpenRestaurant,
  onOpenProduct,
  onStepProduct,
  onQuickAdd,
  onLike,
  onComment,
  onShare,
  cartItemsCount,
  onOpenCart,
  onAudioChange,
}: ProductVideoSlideProps) {
  const { tr } = useI18n();
  const insets = useSafeAreaInsets();
  const isBrand = isBrandAccount(restaurant);
  const isSponsored = isSponsoredFeedPlacement(restaurant);
  const isExternalSponsored = isExternalSponsoredPlacement(restaurant);
  const usesWideShopCta =
    isSponsored &&
    isBrand &&
    !isExternalSponsored &&
    (restaurant.slug === "coca-cola" || restaurant.slug === "eye-therapy-lab");
  const stats = statsFor(restaurant, product);
  const productPrice = product.effective_price ?? product.discount_price ?? product.price;
  const videoUri = product.video_url ?? null;
  const feedVideoKey = productKey(restaurant.id, product.id);
  const [hasAudioTrack, setHasAudioTrack] = useState(product.has_audio ?? true);
  const canPlayAudio = hasRestaurantAudio || hasAudioTrack || product.has_audio === true;
  const shouldMuteOutput = !isActive || !isAudible || !canPlayAudio;
  const shouldMuteVideo = shouldMuteOutput || isRestaurantAudioActive;
  const videoSource = useMemo<VideoSource | null>(
    () =>
      !isActive || !product.video_url
        ? null
        : feedVideoSourceForProduct(product),
    [isActive, product],
  );
  const likes = typeof product.likes_count === "number" ? product.likes_count : stats.likes + (isLiked ? 1 : 0);
  const comments = typeof product.comments_count === "number" ? product.comments_count : stats.comments + commentBump;
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [showVideoLoadingIndicator, setShowVideoLoadingIndicator] = useState(false);
  const [likeHearts, setLikeHearts] = useState<LikeBurstHeart[]>([]);
  const likeBurstIdRef = useRef(0);
  const playerRef = useRef<ReturnType<typeof useVideoPlayer> | null>(null);
  const lastRestartKeyRef = useRef<string | null>(null);
  const player = useVideoPlayer(videoSource, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.volume = 0;
    videoPlayer.audioMixingMode = "duckOthers";
    videoPlayer.bufferOptions = {
      preferredForwardBufferDuration: 3,
      minBufferForPlayback: 0.25,
      prioritizeTimeOverSizeThreshold: true,
    };
  });
  playerRef.current = player;
  const statusEvent = useEvent(player, "statusChange", { status: player.status });
  const playerStatus = statusEvent?.status ?? player.status;

  useEventListener(player, "sourceLoad", (payload) => {
    const audioTrackCount = payload.availableAudioTracks?.length ?? 0;
    const nextHasAudioTrack = audioTrackCount > 0;
    setHasAudioTrack((current) => (current === nextHasAudioTrack ? current : nextHasAudioTrack));
    if (isActive) {
      try {
        player.play();
      } catch {
        // The active-state effect also retries playback.
      }
    }
    logFeedVideo("[FeedVideo] video loaded", {
      key: feedVideoKey,
      uri: videoUri,
      duration: payload.duration,
      hasAudioTrack: audioTrackCount > 0,
      audioTrackCount,
      muted: player.muted,
      volume: player.volume,
    });
  });

  useEventListener(player, "availableAudioTracksChange", ({ availableAudioTracks }) => {
    const nextHasAudioTrack = availableAudioTracks.length > 0;
    setHasAudioTrack((current) => (current === nextHasAudioTrack ? current : nextHasAudioTrack));
    logFeedVideo("[FeedVideo] audio tracks changed", {
      key: feedVideoKey,
      uri: videoUri,
      hasAudioTrack: availableAudioTracks.length > 0,
      audioTrackCount: availableAudioTracks.length,
    });
  });

  useEventListener(player, "mutedChange", ({ muted }) => {
    logFeedVideo("[FeedVideo] muted state changed", {
      key: feedVideoKey,
      muted,
      volume: player.volume,
    });
  });

  useEventListener(player, "volumeChange", ({ volume }) => {
    logFeedVideo("[FeedVideo] volume changed", {
      key: feedVideoKey,
      muted: player.muted,
      volume,
    });
  });

  useEventListener(player, "statusChange", ({ status, error }) => {
    if (status === "error") {
      console.warn("[FeedVideo] playback status error", {
        key: feedVideoKey,
        uri: videoUri,
        error,
      });
    }
  });

  useEffect(() => {
    const nextHasAudioTrack = product.has_audio ?? true;
    setHasRenderedFrame((current) => (current ? false : current));
    setHasPlaybackError((current) => (current ? false : current));
    setHasAudioTrack((current) => (current === nextHasAudioTrack ? current : nextHasAudioTrack));
  }, [product.has_audio, videoUri]);

  useEffect(() => {
    if (!isActive) {
      lastRestartKeyRef.current = null;
      return undefined;
    }
    if (lastRestartKeyRef.current === feedVideoKey) return undefined;

    lastRestartKeyRef.current = feedVideoKey;
    setHasRenderedFrame((current) => (current ? false : current));
    setHasPlaybackError((current) => (current ? false : current));

    const restartTimeout = setTimeout(() => {
      const currentPlayer = playerRef.current;
      if (!currentPlayer) return;

      try {
        currentPlayer.play();
      } catch {
        // The status-driven effect will keep retrying while active.
      }
    }, 0);

    return () => clearTimeout(restartTimeout);
  }, [feedVideoKey, isActive]);

  useEffect(() => {
    if (playerStatus === "error") {
      setHasPlaybackError((current) => (current ? current : true));
      return;
    }

    if (playerStatus === "loading" || playerStatus === "readyToPlay") {
      setHasPlaybackError((current) => (current ? false : current));
    }
  }, [playerStatus]);

  useEffect(() => {
    if (!isActive || hasRenderedFrame || hasPlaybackError) return undefined;
    if (playerStatus !== "loading" && playerStatus !== "readyToPlay") return undefined;

    const timeoutId = setTimeout(() => {
      setHasPlaybackError((current) => (current ? current : true));
      try {
        player.pause();
      } catch {
        // Keep feed usable even if pause fails.
      }
      console.warn("[FeedVideo] loading timeout fallback", {
        key: feedVideoKey,
        uri: videoUri,
        status: playerStatus,
        timeoutMs: FEED_VIDEO_LOAD_TIMEOUT_MS,
      });
    }, FEED_VIDEO_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [feedVideoKey, hasPlaybackError, hasRenderedFrame, isActive, player, playerStatus, videoUri]);

  useEffect(() => {
    if (!isActive || hasRenderedFrame || hasPlaybackError || playerStatus !== "loading") {
      setShowVideoLoadingIndicator((current) => (current ? false : current));
      return undefined;
    }

    const loadingIndicatorTimeout = setTimeout(() => {
      setShowVideoLoadingIndicator(true);
    }, 700);

    return () => {
      clearTimeout(loadingIndicatorTimeout);
      setShowVideoLoadingIndicator((current) => (current ? false : current));
    };
  }, [hasPlaybackError, hasRenderedFrame, isActive, playerStatus]);

  const applyVideoAudioState = useCallback(
    (muted: boolean, volume: number, reason: string) => {
      try {
        const nextAudioMixingMode = muted ? "mixWithOthers" : "duckOthers";
        if (
          player.muted === muted &&
          Math.abs(player.volume - volume) < 0.001 &&
          player.audioMixingMode === nextAudioMixingMode
        ) {
          return;
        }
        player.audioMixingMode = nextAudioMixingMode;
        player.muted = muted;
        player.volume = volume;
        logFeedVideo("[FeedVideo] video audio state applied", {
          key: feedVideoKey,
          reason,
          isActive,
          muted,
          volume,
        });
      } catch (error) {
        console.warn("[FeedVideo] audio state error", {
          key: feedVideoKey,
          reason,
          error,
        });
      }
    },
    [feedVideoKey, isActive, player],
  );

  const requestPlay = useCallback(
    (reason: string) => {
      try {
        const playResult = player.play() as unknown;
        logFeedVideo("[FeedVideo] play() requested", {
          key: feedVideoKey,
          reason,
          isActive,
          muted: player.muted,
          volume: player.volume,
          status: player.status,
        });

        if (playResult && typeof (playResult as Promise<void>).catch === "function") {
          void (playResult as Promise<void>).catch((error) => {
            console.warn("[FeedVideo] play() error", {
              key: feedVideoKey,
              reason,
              error,
            });
          });
        }
      } catch (error) {
        console.warn("[FeedVideo] play() error", {
          key: feedVideoKey,
          reason,
          error,
        });
      }
    },
    [feedVideoKey, isActive, player],
  );

  useEffect(() => {
    applyVideoAudioState(
      shouldMuteVideo,
      shouldMuteVideo ? 0 : 1,
      shouldMuteOutput ? "inactive-or-muted" : isRestaurantAudioActive ? "standalone-audio-active" : "active-user-unmuted",
    );
  }, [applyVideoAudioState, isRestaurantAudioActive, shouldMuteOutput, shouldMuteVideo]);

  useEffect(() => {
    if (!isActive) {
      try {
        player.pause();
      } catch {
        // Ignore pause failures from an idle player without a loaded source.
      }
      return undefined;
    }

    if (playerStatus !== "error") {
      requestPlay(shouldMuteOutput ? "active-muted-autoplay" : "active-audible-user-play");
    }

    return undefined;
  }, [isActive, player, playerStatus, requestPlay, shouldMuteOutput]);

  const handleAudioPress = useCallback(() => {
    void Haptics.selectionAsync();

    if (!isActive) {
      logFeedVideo("[FeedVideo] audio button ignored for inactive video", {
        key: feedVideoKey,
        muted: player.muted,
        volume: player.volume,
      });
      return;
    }

    if (!canPlayAudio) {
      logFeedVideo("[FeedVideo] audio button ignored because no audio source is available", {
        key: feedVideoKey,
        uri: videoUri,
      });
      applyVideoAudioState(true, 0, "no-audio-source");
      return;
    }

    if (isAudible) {
      onAudioChange(false);
      applyVideoAudioState(true, 0, "user-muted");
      return;
    }

    onAudioChange(true);
    applyVideoAudioState(hasRestaurantAudio, hasRestaurantAudio ? 0 : 1, "user-unmuted");
    requestPlay("user-unmuted");
  }, [
    applyVideoAudioState,
    canPlayAudio,
    feedVideoKey,
    hasRestaurantAudio,
    isActive,
    isAudible,
    onAudioChange,
    player,
    requestPlay,
    videoUri,
  ]);

  const handleLikePress = useCallback(() => {
    const willLike = !isLiked;
    onLike();

    if (!willLike) return;

    const burstIdBase = likeBurstIdRef.current + 1;
    likeBurstIdRef.current += 7;
    const hearts: LikeBurstHeart[] = Array.from({ length: 7 }).map((_, heartIndex) => ({
      id: burstIdBase + heartIndex,
      xOffset: Math.round((Math.random() - 0.5) * 38),
      size: 12 + Math.round(Math.random() * 6),
      duration: 520 + Math.round(Math.random() * 220),
      delay: Math.round(Math.random() * 80),
      rotate: `${Math.round((Math.random() - 0.5) * 30)}deg`,
    }));

    setLikeHearts((current) => [...current, ...hearts]);
  }, [isLiked, onLike]);

  const removeHeart = useCallback((id: number) => {
    setLikeHearts((current) => current.filter((heart) => heart.id !== id));
  }, []);

  const handleVideoPress = useCallback(
    (tapX: number) => {
      onStepProduct(tapX < width / 2 ? "prev" : "next");
    },
    [onStepProduct, width],
  );

  return (
    <View style={[styles.slide, { width, height }]}>
      {videoSource ? (
        <>
          {!hasRenderedFrame ? (
            <View style={styles.videoBlackFrame} />
          ) : null}
          <VideoView
            player={player}
            style={[styles.videoSurface, hasPlaybackError && styles.videoSurfaceHidden]}
            contentFit="cover"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture={false}
            playsInline
            pointerEvents="none"
            surfaceType="textureView"
            useExoShutter={false}
            onFirstFrameRender={() => {
              setHasRenderedFrame(true);
              logFeedVideo("[FeedVideo] first frame rendered", {
                key: feedVideoKey,
                uri: videoUri,
                muted: player.muted,
                volume: player.volume,
              });
            }}
          />
          {hasPlaybackError ? <View style={styles.videoBlackFrame} /> : null}
        </>
      ) : (
        <View style={styles.videoBlackFrame} />
      )}
      {showVideoLoadingIndicator ? (
        <View pointerEvents="none" style={styles.videoLoadingLayer}>
          <ActivityIndicator color={colors.white} />
        </View>
      ) : null}
      <View style={[styles.dimLayer, { bottom: insets.bottom + 92 }]} />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.88)", "rgba(0,0,0,0.56)", "rgba(0,0,0,0.0)"]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={styles.bottomFadeOverlay}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.80)", "rgba(0,0,0,0.44)", "rgba(0,0,0,0.0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topFadeOverlay}
      />

      <Pressable
        style={[styles.fullSlidePressable, { bottom: insets.bottom + 190 }]}
        onPress={(event) => handleVideoPress(event.nativeEvent.locationX)}
      />

      <View style={styles.actionStack}>
        {cartItemsCount > 0 ? (
          <Pressable style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]} onPress={onOpenCart}>
            <View style={styles.cartIconWrap}>
              <ShoppingBag size={22} stroke="#0A0A0A" />
              <View style={styles.cartCountBadge}>
                <Text style={styles.cartCountBadgeText}>{cartItemsCount}</Text>
              </View>
            </View>
          </Pressable>
        ) : null}
        <View style={styles.likeButtonWrap}>
          <View pointerEvents="none" style={styles.likeBurstLayer}>
            {isLiked ? PERSISTENT_LIKE_HEARTS.map((heart) => (
              <PersistentLikeHeartDot key={heart.id} heart={heart} />
            )) : null}
            {likeHearts.map((heart) => (
              <FloatingLikeHeart
                key={heart.id}
                heart={heart}
                onDone={() => removeHeart(heart.id)}
              />
            ))}
          </View>
          <SocialButton
            label={compactCount(likes)}
            active={isLiked}
            onPress={handleLikePress}
            icon={<Heart size={24} stroke="#000000" strokeWidth={1} fill={isLiked ? "#FF4D6D" : colors.white} />}
          />
        </View>
        <SocialButton
          label={compactCount(comments)}
          onPress={onComment}
          icon={<MessageSquare size={24} stroke={colors.white} fill={colors.white} />}
        />
        <SocialButton
          label={compactCount(stats.shares)}
          onPress={onShare}
          icon={<Repeat2 size={24} stroke={colors.white} />}
        />
        <SocialButton
          onPress={handleAudioPress}
          active={isAudible && canPlayAudio}
          hideLabel
          label={canPlayAudio ? (isAudible ? tr("Sunet", "Sound") : tr("Mut", "Muted")) : tr("Fără audio", "No audio")}
          icon={
            isAudible && canPlayAudio
              ? <Volume2 size={24} stroke={colors.white} fill={colors.white} />
              : <VolumeX size={24} stroke={colors.white} fill={colors.white} />
          }
        />
      </View>

      <View style={styles.contentOverlay}>
        {isSponsored ? (
          <View style={styles.sponsoredTopRow}>
            <RestaurantAvatarImage restaurant={restaurant} style={styles.sponsoredAvatar} resizeMode="contain" />
          </View>
        ) : null}
        <Pressable onPress={onOpenProduct}>
          <Text numberOfLines={2} style={styles.productTitle}>{product.name}</Text>
          <Text numberOfLines={2} style={styles.productDescription}>{product.description || restaurant.description}</Text>
        </Pressable>

        <Pressable style={styles.restaurantHeader} onPress={onOpenRestaurant}>
          <View style={styles.restaurantIconWrap}>
            <UtensilsCrossed size={13} stroke={colors.white} />
          </View>
          <View style={styles.restaurantTextBlock}>
            <Text numberOfLines={1} style={styles.restaurantName}>{restaurant.name}</Text>
            <Text numberOfLines={1} style={styles.restaurantMeta}>
              {isBrand
                ? tr(
                    isExternalSponsored
                      ? "Brand verificat · deschidere direct pe site"
                      : "Brand verificat · cumpărare directă din aplicație",
                    isExternalSponsored
                      ? "Verified brand · opens directly on brand site"
                      : "Verified brand · in-app checkout",
                  )
                : `${Number(restaurant.rating).toFixed(1)} ★ · ${restaurant.estimated_delivery_time_min}-${restaurant.estimated_delivery_time_max} min · ${money(restaurant.delivery_fee)} livrare`}
            </Text>
          </View>
        </Pressable>

      </View>
      <View style={[styles.ctaRow, { bottom: insets.bottom + 58 }]}>
        <View style={[styles.ctaButtonsWrap, (isExternalSponsored || usesWideShopCta) && styles.ctaButtonsWrapExternal]}>
          <Pressable
            style={[
              styles.menuButton,
              (isExternalSponsored || usesWideShopCta) && styles.externalWebsiteButton,
              usesWideShopCta && styles.sponsoredShopButton,
            ]}
            onPress={onOpenRestaurant}
          >
            {isExternalSponsored ? (
              <Globe size={16} stroke={colors.white} />
            ) : isSponsored && isBrand ? (
              <ShoppingBag size={16} stroke={colors.white} />
            ) : (
              <UtensilsCrossed size={16} stroke={colors.white} />
            )}
            <Text style={styles.menuButtonText}>
              {tr(
                isExternalSponsored ? "Vizitează site-ul" : isSponsored && isBrand ? "SHOP" : isBrand ? "Profil" : "Meniu",
                isExternalSponsored ? "Visit website" : isSponsored && isBrand ? "SHOP" : isBrand ? "Profile" : "Menu",
              )}
            </Text>
          </Pressable>
          {!isExternalSponsored && !usesWideShopCta ? (
            <Pressable style={styles.orderButton} onPress={onQuickAdd}>
              <ShoppingBag size={18} stroke="#111111" />
              <Text style={styles.orderButtonText}>
                + {tr(isBrand ? "Cumpără" : "Adaugă", isBrand ? "Shop" : "Add")}
              </Text>
              <View style={styles.orderButtonPriceBadge}>
                <View style={styles.orderButtonPriceWrap}>
                  <Text style={styles.orderButtonPrice}>{money(productPrice).replace(",", ".")}</Text>
                  <View pointerEvents="none" style={styles.orderPriceLineGreenStrike} />
                </View>
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

type FloatingLikeHeartProps = {
  heart: LikeBurstHeart;
  onDone: () => void;
};

function FloatingLikeHeart({ heart, onDone }: FloatingLikeHeartProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(heart.delay),
      Animated.timing(progress, {
        toValue: 1,
        duration: heart.duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) onDone();
    });

    return () => {
      animation.stop();
    };
  }, [heart.delay, heart.duration, onDone, progress]);

  return (
    <Animated.Text
      style={[
        styles.floatingHeart,
        {
          fontSize: heart.size,
          left: 24 + heart.xOffset,
          opacity: progress.interpolate({
            inputRange: [0, 0.2, 1],
            outputRange: [0, 1, 0],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [2, -54],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 0.15, 1],
                outputRange: [0.6, 1.1, 0.85],
              }),
            },
            { rotate: heart.rotate },
          ],
        },
      ]}
    >
      ♥
    </Animated.Text>
  );
}

type PersistentLikeHeartDotProps = {
  heart: PersistentLikeHeart;
};

function PersistentLikeHeartDot({ heart }: PersistentLikeHeartDotProps) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(heart.delay),
        Animated.timing(bob, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [bob, heart.delay]);

  return (
    <Animated.Text
      style={[
        styles.persistentHeart,
        {
          fontSize: heart.size,
          left: 25 + heart.xOffset,
          top: 14 + heart.yOffset,
          opacity: bob.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.35, 0.85, 0.35],
          }),
          transform: [
            {
              translateY: bob.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -4],
              }),
            },
          ],
        },
      ]}
    >
      ♥
    </Animated.Text>
  );
}

type SocialButtonProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  hideLabel?: boolean;
  onPress: () => void;
};

function SocialButton({ icon, label, active, hideLabel, onPress }: SocialButtonProps) {
  return (
    <Pressable style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]} onPress={onPress}>
      <View style={[styles.socialIconWrap, active && styles.socialIconWrapActive]}>{icon}</View>
      {!hideLabel ? <Text style={styles.socialLabel}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050505",
    paddingHorizontal: 28,
  },
  loadingLogoWrap: {
    alignItems: "flex-start",
  },
  loadingLogoText: {
    color: "#FFFFFF",
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  loadingLogoTextAccent: {
    color: "#67D48A",
  },
  loadingLogoUnderlineRow: {
    marginTop: -2,
    flexDirection: "row",
    alignItems: "center",
  },
  loadingLogoUnderlineGreen: {
    width: 124,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#67D48A",
  },
  loadingLogoUnderlineWhite: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    marginLeft: 0,
  },
  page: {
    backgroundColor: "#050505",
  },
  locationChip: {
    position: "absolute",
    left: 14,
    maxWidth: "72%",
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    zIndex: 18,
  },
  locationChipText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  slide: {
    overflow: "hidden",
    backgroundColor: "#050505",
  },
  videoSurface: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    zIndex: 1,
  },
  videoSurfaceHidden: {
    opacity: 0,
  },
  videoFallbackImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    zIndex: 1,
  },
  videoBlackFrame: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#050505",
    zIndex: 1,
  },
  videoLoadingLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050505",
  },
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
    zIndex: 3,
  },
  bottomFadeOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 360,
    zIndex: 4,
  },
  topFadeOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 220,
    zIndex: 4,
  },
  fullSlidePressable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  feedTopProductPagers: {
    position: "absolute",
    top: 58,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    zIndex: 12,
  },
  feedTopProductDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  feedTopProductDotActive: {
    backgroundColor: colors.white,
  },
  commentsModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  commentsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  commentsKeyboardAvoider: {
    flex: 1,
    justifyContent: "flex-end",
  },
  commentsSheet: {
    position: "relative",
    backgroundColor: "#0F0F10",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: "76%",
    paddingTop: 10,
    paddingBottom: 8,
  },
  commentsKeyboardFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -260,
    height: 260,
    backgroundColor: "#0F0F10",
  },
  commentsHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginBottom: 14,
  },
  commentsTitle: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 14,
  },
  commentsBody: {
    flex: 1,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingHorizontal: 14,
    gap: 20,
    paddingBottom: 18,
  },
  commentsFooterSpacer: {
    height: 72,
  },
  commentThread: {
    gap: 10,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  commentAvatarText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
  commentBody: {
    flex: 1,
    gap: 3,
  },
  commentTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentAuthor: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  commentMeta: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  commentText: {
    color: "#E5E7EB",
    fontSize: 14,
    lineHeight: 19,
  },
  commentPhotoPreviewWrap: {
    marginTop: 6,
    width: 112,
    height: 112,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  commentPhoto: {
    width: 112,
    height: 112,
    backgroundColor: "#1A1A1A",
  },
  commentPhotoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  commentPhotoOverlayText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  commentActionsRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  replyButton: {
    alignSelf: "flex-start",
  },
  replyButtonText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
  },
  viewRepliesButton: {
    alignSelf: "flex-start",
  },
  viewRepliesButtonText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "700",
  },
  replyRow: {
    marginLeft: 44,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  replyAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#202124",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  replyAvatarText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 10,
  },
  replyBody: {
    flex: 1,
    gap: 3,
  },
  replyAuthor: {
    color: "#F3F4F6",
    fontSize: 12,
    fontWeight: "700",
  },
  replyText: {
    color: "#D1D5DB",
    fontSize: 13,
    lineHeight: 18,
  },
  replyPhotoPreviewWrap: {
    marginTop: 6,
    width: 92,
    height: 92,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  replyPhoto: {
    width: 92,
    height: 92,
    backgroundColor: "#1A1A1A",
  },
  replyPhotoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  replyPhotoOverlayText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  galleryModalRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
    zIndex: 100,
  },
  galleryBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  galleryCloseButton: {
    position: "absolute",
    top: 52,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  gallerySlide: {
    alignItems: "center",
    justifyContent: "center",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  commentLikeCol: {
    minWidth: 38,
    alignItems: "center",
    gap: 3,
    paddingTop: 2,
  },
  commentLikeCount: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  commentLikeCountActive: {
    color: "#FF4D6D",
  },
  commentComposerWrap: {
    backgroundColor: "#0F0F10",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 8,
    paddingBottom: 8,
    marginBottom: 10,
  },
  replyComposerBanner: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#1B1B1C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  replyComposerText: {
    flex: 1,
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "700",
  },
  replyComposerCancel: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#252629",
  },
  pendingPhotosRow: {
    paddingHorizontal: 14,
    gap: 8,
    paddingBottom: 8,
  },
  pendingPhotoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#202124",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingPhotoThumb: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  commentInputRow: {
    marginHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#1B1B1C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentComposerAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#252629",
  },
  commentInput: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    paddingVertical: 8,
  },
  commentSendButton: {
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  commentSendButtonDisabled: {
    opacity: 0.45,
  },
  commentSendButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  actionStack: {
    position: "absolute",
    right: 12,
    bottom: 159,
    alignItems: "center",
    gap: 4,
    zIndex: 12,
  },
  likeButtonWrap: {
    position: "relative",
  },
  likeBurstLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -6,
    bottom: 0,
    zIndex: 20,
  },
  floatingHeart: {
    position: "absolute",
    top: 12,
    color: "#FF4D6D",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 4,
  },
  persistentHeart: {
    position: "absolute",
    color: "#FF4D6D",
    textShadowColor: "rgba(0,0,0,0.28)",
    textShadowRadius: 3,
  },
  socialButton: {
    position: "relative",
    width: 50,
    height: 60,
    alignItems: "center",
  },
  socialButtonPressed: {
    transform: [{ scale: 0.94 }],
  },
  socialIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  socialIconWrapActive: {
    backgroundColor: "transparent",
  },
  cartIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
  },
  cartCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0A0A",
  },
  cartCountBadgeText: {
    color: colors.white,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "700",
  },
  socialLabel: {
    position: "absolute",
    top: 40,
    color: colors.white,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowRadius: 8,
  },
  contentOverlay: {
    position: "absolute",
    left: 18,
    right: 82,
    bottom: 176,
    zIndex: 11,
  },
  sponsoredTopRow: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  sponsoredAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  restaurantHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  restaurantIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  restaurantTextBlock: {
    flex: 1,
  },
  restaurantName: {
    flexShrink: 1,
    color: colors.white,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  restaurantMeta: {
    marginTop: 4,
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  productTitle: {
    marginTop: 4,
    color: colors.white,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "700",
    letterSpacing: -0.1,
    textShadowColor: "rgba(0,0,0,0.58)",
    textShadowRadius: 14,
  },
  productDescription: {
    marginTop: 8,
    paddingRight: 8,
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
    letterSpacing: 0.1,
    textShadowColor: "rgba(0,0,0,0.62)",
    textShadowRadius: 10,
  },
  ctaRow: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 14,
  },
  ctaButtonsWrap: {
    width: "88%",
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  ctaButtonsWrapExternal: {
    justifyContent: "center",
  },
  menuButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.white,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  externalWebsiteButton: {
    minWidth: "72%",
    paddingHorizontal: 24,
  },
  sponsoredShopButton: {
    minWidth: "78%",
    justifyContent: "center",
  },
  menuButtonText: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  orderButton: {
    flex: 1,
    minHeight: 44,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingLeft: 12,
    paddingRight: 0,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#000000",
    overflow: "hidden",
  },
  orderButtonPriceBadge: {
    alignSelf: "stretch",
    paddingLeft: 12,
    paddingRight: 12,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    flexDirection: "row",
    gap: 8,
  },
  orderButtonPriceWrap: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  orderButtonText: {
    color: "#111111",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  orderButtonPrice: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  orderPriceLineGreenStrike: {
    position: "absolute",
    left: -1,
    right: -1,
    top: "50%",
    marginTop: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#45E56B",
  },
});
