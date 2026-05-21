import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEvent, useEventListener } from "expo";
import { type AudioSource, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  Heart,
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
  NativeScrollEvent,
  NativeSyntheticEvent,
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

import { restaurantsApi } from "../api/restaurantsApi";
import { getDemoProductAudioSource } from "../data/demoAudio";
import { getDemoProductVideoLabel, getDemoProductVideoSource } from "../data/demoVideos";
import { useI18n } from "../i18n/useI18n";
import { money } from "../lib/format";
import { resolveProductImageUri, resolveRestaurantImageUri } from "../lib/images";
import { HomeStackParamList } from "../navigation/types";
import { useCartStore } from "../store/cartStore";
import { useFavoritesStore } from "../store/favoritesStore";
import { colors } from "../theme/colors";
import { Product, Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

type FeedRestaurant = {
  restaurant: Restaurant;
  products: Product[];
  initialProductIndex: number;
};

const VIDEO_POSTERS = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=1300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=1300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?q=80&w=1300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529042410759-befb1204b468?q=80&w=1300&auto=format&fit=crop",
];

const productKey = (restaurantId: number, productId: number) => `${restaurantId}:${productId}`;
const FEED_STANDALONE_AUDIO_VOLUME = 0.82;
const FEED_VIDEO_LOAD_TIMEOUT_MS = 12000;
const FEED_VIDEO_DEBUG = false;
const logFeedVideo = (...args: Parameters<typeof console.log>) => {
  if (FEED_VIDEO_DEBUG) console.log(...args);
};

const compactCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
};

const statsFor = (restaurant: Restaurant, product: Product) => {
  const seed = restaurant.id * 41 + product.id * 17;
  return {
    likes: 1400 + (seed % 82) * 137,
    comments: 28 + (seed % 64),
    shares: 12 + (seed % 33),
  };
};

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

export function HomeScreen({ navigation }: Props) {
  const { tr } = useI18n();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const addItem = useCartStore((state) => state.addItem);
  const favoriteRestaurantIds = useFavoritesStore((state) => state.restaurantIds);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [productsByRestaurant, setProductsByRestaurant] = useState<Record<number, Product[]>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [commentBumps, setCommentBumps] = useState<Record<string, number>>({});
  const [activeRestaurantIndex, setActiveRestaurantIndex] = useState(0);
  const [activeProductByRestaurant, setActiveProductByRestaurant] = useState<Record<number, number>>({});
  const [audiblePostKey, setAudiblePostKey] = useState<string | null>(null);
  const [hasAutoSelectedAudiblePost, setHasAutoSelectedAudiblePost] = useState(false);
  const [isRestaurantScrollEnabled, setIsRestaurantScrollEnabled] = useState(true);
  const [feedHeight, setFeedHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pageHeight = feedHeight || screenHeight;

  const fetchFeed = useCallback(async () => {
    const restaurantItems = await restaurantsApi.list({ ordering: "-rating" });
    const openRestaurants = restaurantItems.filter((item) => item.is_open !== false);
    const scopedRestaurants = favoriteRestaurantIds.length
      ? openRestaurants.filter((item) => favoriteRestaurantIds.includes(item.id))
      : openRestaurants;
    const visibleRestaurants = scopedRestaurants.slice(0, 12);
    setRestaurants(visibleRestaurants);

    const productEntries = await Promise.all(
      visibleRestaurants.map(async (restaurant) => {
        const products = await restaurantsApi.products(restaurant.id);
        return [restaurant.id, products.slice(0, 3)] as const;
      }),
    );

    setProductsByRestaurant(Object.fromEntries(productEntries));
  }, [favoriteRestaurantIds]);

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
        initialProductIndex: restaurantIndex % resolvedProducts.length,
      };
    });
  }, [productsByRestaurant, restaurants]);

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

  const quickAdd = useCallback(
    (restaurant: Restaurant, product: Product) => {
      const hasRequiredOptions = (product.option_groups ?? []).some((group) => group.is_required || group.min_select > 0);
      if (hasRequiredOptions) {
        navigation.navigate("ProductDetails", { restaurant, product });
        return;
      }

      addItem({ restaurant, product, quantity: 1 });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [addItem, navigation],
  );

  const toggleLike = useCallback((restaurant: Restaurant, product: Product) => {
    const key = productKey(restaurant.id, product.id);
    setLikedPosts((current) => ({ ...current, [key]: !current[key] }));
    void Haptics.selectionAsync();
  }, []);

  const addCommentBump = useCallback((restaurant: Restaurant, product: Product) => {
    const key = productKey(restaurant.id, product.id);
    setCommentBumps((current) => ({ ...current, [key]: (current[key] ?? 0) + 1 }));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  useEffect(() => {
    if (!activePostKey) {
      setAudiblePostKey(null);
      return;
    }

    if (!hasAutoSelectedAudiblePost) {
      setAudiblePostKey(activePostKey);
      setHasAutoSelectedAudiblePost(true);
      return;
    }

    if (audiblePostKey !== null && audiblePostKey !== activePostKey) {
      setAudiblePostKey(activePostKey);
    }
  }, [activePostKey, audiblePostKey, hasAutoSelectedAudiblePost]);

  if (isLoading && !feedData.length) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingBrandMark}>
          <UtensilsCrossed size={28} stroke={colors.white} />
        </View>
        <ActivityIndicator color={colors.white} />
        <Text style={styles.loadingTitle}>ONE DINING CLUB</Text>
        <Text style={styles.loadingText}>{tr("Pregătim feedul video", "Preparing the video feed")}</Text>
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
            isRestaurantAudible={Boolean(audiblePostKey?.startsWith(`${item.restaurant.id}:`))}
            activeProductIndex={activeProductByRestaurant[item.restaurant.id] ?? item.initialProductIndex}
            audiblePostKey={audiblePostKey}
            likedPosts={likedPosts}
            commentBumps={commentBumps}
            onProductIndexChange={(productIndex) => {
              setActiveProductByRestaurant((current) => ({ ...current, [item.restaurant.id]: productIndex }));
            }}
            onHorizontalSwipeStateChange={(isSwipingHorizontally) => {
              setIsRestaurantScrollEnabled(!isSwipingHorizontally);
            }}
            onOpenRestaurant={() => navigation.navigate("RestaurantDetails", { restaurant: item.restaurant })}
            onOpenProduct={(product) => navigation.navigate("ProductDetails", { restaurant: item.restaurant, product })}
            onQuickAdd={(product) => quickAdd(item.restaurant, product)}
            onLike={(product) => toggleLike(item.restaurant, product)}
            onComment={(product) => addCommentBump(item.restaurant, product)}
            onShare={(product) => shareProduct(item.restaurant, product)}
            onAudioChange={(key, shouldEnableAudio) => {
              setAudiblePostKey(shouldEnableAudio ? key : null);
            }}
          />
        )}
        pagingEnabled
        directionalLockEnabled
        snapToInterval={pageHeight}
        decelerationRate="fast"
        disableIntervalMomentum
        scrollEnabled={isRestaurantScrollEnabled}
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

    </View>
  );
}

type RestaurantFeedPageProps = {
  item: FeedRestaurant;
  pageHeight: number;
  pageWidth: number;
  isActive: boolean;
  isRestaurantAudible: boolean;
  activeProductIndex: number;
  audiblePostKey: string | null;
  likedPosts: Record<string, boolean>;
  commentBumps: Record<string, number>;
  onProductIndexChange: (index: number) => void;
  onHorizontalSwipeStateChange: (isSwipingHorizontally: boolean) => void;
  onOpenRestaurant: () => void;
  onOpenProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onLike: (product: Product) => void;
  onComment: (product: Product) => void;
  onShare: (product: Product) => void;
  onAudioChange: (key: string, shouldEnableAudio: boolean) => void;
};

function RestaurantFeedPage({
  item,
  pageHeight,
  pageWidth,
  isActive,
  isRestaurantAudible,
  activeProductIndex,
  audiblePostKey,
  likedPosts,
  commentBumps,
  onProductIndexChange,
  onHorizontalSwipeStateChange,
  onOpenRestaurant,
  onOpenProduct,
  onQuickAdd,
  onLike,
  onComment,
  onShare,
  onAudioChange,
}: RestaurantFeedPageProps) {
  const productListRef = useRef<FlatList<Product>>(null);
  const horizontalLockReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchGestureLockRef = useRef<"horizontal" | "vertical" | null>(null);
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

  const releaseHorizontalScrollLock = useCallback(() => {
    if (horizontalLockReleaseTimeoutRef.current) {
      clearTimeout(horizontalLockReleaseTimeoutRef.current);
    }

    horizontalLockReleaseTimeoutRef.current = setTimeout(() => {
      onHorizontalSwipeStateChange(false);
      horizontalLockReleaseTimeoutRef.current = null;
    }, 120);
  }, [onHorizontalSwipeStateChange]);

  useEffect(() => {
    productListRef.current?.scrollToIndex({ index: clampedActiveProductIndex, animated: false });
  }, [clampedActiveProductIndex]);

  useEffect(() => {
    return () => {
      if (horizontalLockReleaseTimeoutRef.current) {
        clearTimeout(horizontalLockReleaseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const shouldPlay = isActive && isRestaurantAudible;
    try {
      restaurantAudioPlayer.loop = true;
      restaurantAudioPlayer.volume = shouldPlay ? FEED_STANDALONE_AUDIO_VOLUME : 0;
      restaurantAudioPlayer.muted = !shouldPlay;
      if (shouldPlay) {
        if (restaurantAudioStatus.isLoaded && !restaurantAudioStatus.playing) {
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
    isRestaurantAudible,
    restaurantAudioPlayer,
    restaurantAudioStatus.isLoaded,
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
      onTouchStart={(event) => {
        touchStartRef.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
        touchGestureLockRef.current = null;
      }}
      onTouchMove={(event) => {
        const start = touchStartRef.current;
        if (!start || touchGestureLockRef.current) return;

        const dx = event.nativeEvent.pageX - start.x;
        const dy = event.nativeEvent.pageY - start.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.max(absDx, absDy) < 8) return;

        if (absDx > absDy * 1.15) {
          touchGestureLockRef.current = "horizontal";
          onHorizontalSwipeStateChange(true);
        } else if (absDy > absDx * 1.15) {
          touchGestureLockRef.current = "vertical";
          onHorizontalSwipeStateChange(false);
        }
      }}
      onTouchEnd={() => {
        touchStartRef.current = null;
        if (touchGestureLockRef.current === "horizontal") {
          releaseHorizontalScrollLock();
        }
        touchGestureLockRef.current = null;
      }}
      onTouchCancel={() => {
        touchStartRef.current = null;
        if (touchGestureLockRef.current === "horizontal") {
          releaseHorizontalScrollLock();
        }
        touchGestureLockRef.current = null;
      }}
    >
      <FlatList
        ref={productListRef}
        horizontal
        data={item.products}
        keyExtractor={(product) => String(product.id)}
        renderItem={({ item: product, index }) => {
          const key = productKey(item.restaurant.id, product.id);
          const isSlideActive = isActive && index === clampedActiveProductIndex;
          return (
            <ProductVideoSlide
              restaurant={item.restaurant}
              product={product}
              index={index}
              productCount={item.products.length}
              width={pageWidth}
              height={pageHeight}
              isActive={isSlideActive}
              isAudible={audiblePostKey === key && isSlideActive}
              hasRestaurantAudio
              isLiked={Boolean(likedPosts[key])}
              commentBump={commentBumps[key] ?? 0}
              onOpenRestaurant={onOpenRestaurant}
              onOpenProduct={() => onOpenProduct(product)}
              onStepProduct={handleStepProduct}
              onQuickAdd={() => onQuickAdd(product)}
              onLike={() => onLike(product)}
              onComment={() => onComment(product)}
              onShare={() => onShare(product)}
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
        onScrollBeginDrag={() => {
          if (horizontalLockReleaseTimeoutRef.current) {
            clearTimeout(horizontalLockReleaseTimeoutRef.current);
            horizontalLockReleaseTimeoutRef.current = null;
          }
          onHorizontalSwipeStateChange(true);
        }}
        onMomentumScrollEnd={releaseHorizontalScrollLock}
        onScrollEndDrag={releaseHorizontalScrollLock}
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
  productCount: number;
  width: number;
  height: number;
  isActive: boolean;
  isAudible: boolean;
  hasRestaurantAudio: boolean;
  isLiked: boolean;
  commentBump: number;
  onOpenRestaurant: () => void;
  onOpenProduct: () => void;
  onStepProduct: (direction: "prev" | "next") => void;
  onQuickAdd: () => void;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
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

const PERSISTENT_LIKE_HEARTS: PersistentLikeHeart[] = [
  { id: 1, xOffset: -12, yOffset: -2, size: 8, delay: 0 },
  { id: 2, xOffset: 0, yOffset: -8, size: 9, delay: 180 },
  { id: 3, xOffset: 12, yOffset: -2, size: 8, delay: 360 },
];

function ProductVideoSlide({
  restaurant,
  product,
  index,
  productCount,
  width,
  height,
  isActive,
  isAudible,
  hasRestaurantAudio,
  isLiked,
  commentBump,
  onOpenRestaurant,
  onOpenProduct,
  onStepProduct,
  onQuickAdd,
  onLike,
  onComment,
  onShare,
  onAudioChange,
}: ProductVideoSlideProps) {
  const { tr } = useI18n();
  const insets = useSafeAreaInsets();
  const stats = statsFor(restaurant, product);
  const posterIndex = Math.abs(restaurant.id * 7 + product.id * 3 + index) % VIDEO_POSTERS.length;
  const productPrice = product.effective_price ?? product.discount_price ?? product.price;
  const posterUri = product.image ? resolveProductImageUri(product.image, product.id) : VIDEO_POSTERS[posterIndex];
  const mediaIndex = (restaurant.id - 1) * 10 + index;
  const fallbackVideoSource = getDemoProductVideoSource(mediaIndex);
  const videoUri = product.video_url ?? getDemoProductVideoLabel(mediaIndex);
  const feedVideoKey = productKey(restaurant.id, product.id);
  const [hasAudioTrack, setHasAudioTrack] = useState(product.has_audio ?? true);
  const canPlayAudio = hasRestaurantAudio || hasAudioTrack || product.has_audio === true;
  const shouldMuteOutput = !isActive || !isAudible || !canPlayAudio;
  const shouldMuteVideo = shouldMuteOutput || hasRestaurantAudio;
  const videoSource = useMemo(
    () =>
      product.video_url
        ? ({
            uri: product.video_url,
            contentType: "progressive" as const,
            useCaching: false,
          } as const)
        : fallbackVideoSource,
    [fallbackVideoSource, product.video_url],
  );
  const restaurantPosterUri = resolveRestaurantImageUri(restaurant.cover_image, restaurant.id);
  const comments = stats.comments + commentBump;
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [likeHearts, setLikeHearts] = useState<LikeBurstHeart[]>([]);
  const likeBurstIdRef = useRef(0);
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
  const statusEvent = useEvent(player, "statusChange", { status: player.status });
  const playingEvent = useEvent(player, "playingChange", { isPlaying: player.playing });
  const playerStatus = statusEvent?.status ?? player.status;
  const isPlaying = playingEvent?.isPlaying ?? player.playing;

  useEventListener(player, "sourceLoad", (payload) => {
    const audioTrackCount = payload.availableAudioTracks?.length ?? 0;
    setHasAudioTrack(audioTrackCount > 0);
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
    setHasAudioTrack(availableAudioTracks.length > 0);
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
    setHasRenderedFrame(false);
    setHasPlaybackError(false);
    setHasAudioTrack(product.has_audio ?? true);
  }, [product.has_audio, videoUri]);

  useEffect(() => {
    if (playerStatus === "error") {
      setHasPlaybackError(true);
      return;
    }

    if (playerStatus === "loading" || playerStatus === "readyToPlay") {
      setHasPlaybackError(false);
    }
  }, [playerStatus]);

  useEffect(() => {
    if (!isActive || hasRenderedFrame || hasPlaybackError) return undefined;
    if (playerStatus !== "loading" && playerStatus !== "readyToPlay") return undefined;

    const timeoutId = setTimeout(() => {
      setHasPlaybackError(true);
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
      shouldMuteOutput ? "inactive-or-muted" : hasRestaurantAudio ? "standalone-audio-active" : "active-user-unmuted",
    );
  }, [applyVideoAudioState, hasRestaurantAudio, shouldMuteOutput, shouldMuteVideo]);

  useEffect(() => {
    if (!isActive) {
      player.pause();
      return undefined;
    }

    if (playerStatus !== "error" && !isPlaying) {
      requestPlay(shouldMuteOutput ? "active-muted-autoplay" : "active-audible-user-play");
    }

    return undefined;
  }, [isActive, isPlaying, player, playerStatus, requestPlay, shouldMuteOutput]);

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
      xOffset: Math.round((Math.random() - 0.5) * 30),
      size: 9 + Math.round(Math.random() * 5),
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
      {hasPlaybackError ? (
        <Image source={{ uri: posterUri }} style={styles.videoFallbackImage} resizeMode="cover" />
      ) : null}
      {isActive && playerStatus === "loading" && !hasPlaybackError ? (
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
        style={styles.fullSlidePressable}
        onPress={(event) => handleVideoPress(event.nativeEvent.locationX)}
      />

      <View style={styles.productPagers} pointerEvents="none">
        {Array.from({ length: Math.min(productCount, 10) }).map((_, dotIndex) => (
          <View key={dotIndex} style={[styles.productDot, dotIndex === index && styles.productDotActive]} />
        ))}
      </View>

      <View style={styles.actionStack}>
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
            label={compactCount(stats.likes + (isLiked ? 1 : 0))}
            active={isLiked}
            onPress={handleLikePress}
            icon={<Heart size={24} stroke={colors.white} fill={colors.white} />}
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
              {Number(restaurant.rating).toFixed(1)} ★ · {restaurant.estimated_delivery_time_min}-{restaurant.estimated_delivery_time_max} min · {money(restaurant.delivery_fee)} livrare
            </Text>
          </View>
        </Pressable>

      </View>
      <View style={[styles.ctaRow, { bottom: insets.bottom + 58 }]}>
        <View style={styles.ctaButtonsWrap}>
          <Pressable style={styles.menuButton} onPress={onOpenRestaurant}>
            <UtensilsCrossed size={16} stroke={colors.white} />
            <Text style={styles.menuButtonText}>{tr("Meniu", "Menu")}</Text>
          </Pressable>
          <Pressable style={styles.orderButton} onPress={onQuickAdd}>
            <ShoppingBag size={18} stroke="#111111" />
            <Text style={styles.orderButtonText}>+ {tr("Adaugă", "Add")}</Text>
            <View style={styles.orderButtonPriceBadge}>
              <View style={styles.orderButtonPriceWrap}>
                <Text style={styles.orderButtonPrice}>{money(productPrice).replace(",", ".")}</Text>
                <View pointerEvents="none" style={styles.orderPriceLineGreenStrike} />
              </View>
            </View>
          </Pressable>
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
                outputRange: [2, -46],
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
    gap: 14,
    backgroundColor: "#050505",
    paddingHorizontal: 28,
  },
  loadingBrandMark: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  loadingTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2.4,
  },
  loadingText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 14,
    fontWeight: "700",
  },
  page: {
    backgroundColor: "#050505",
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
  productPagers: {
    position: "absolute",
    top: 58,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    zIndex: 12,
  },
  productDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  productDotActive: {
    backgroundColor: colors.white,
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
