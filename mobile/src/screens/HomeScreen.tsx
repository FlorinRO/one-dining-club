import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEvent } from "expo";
import * as Haptics from "expo-haptics";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  Heart,
  MessageCircle,
  Send,
  Share2,
  ShoppingBag,
  Star,
  UtensilsCrossed,
} from "lucide-react-native";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useI18n } from "../i18n/useI18n";
import { money } from "../lib/format";
import { resolveProductImageUri, resolveRestaurantImageUri } from "../lib/images";
import { HomeStackParamList } from "../navigation/types";
import { useCartStore } from "../store/cartStore";
import { colors } from "../theme/colors";
import { Product, Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

type FeedRestaurant = {
  restaurant: Restaurant;
  products: Product[];
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

const MOCK_VIDEO_SOURCES = [
  "https://assets.mixkit.co/videos/47555/47555-720.mp4",
  "https://assets.mixkit.co/videos/43063/43063-720.mp4",
  "https://assets.mixkit.co/videos/3806/3806-720.mp4",
  "https://assets.mixkit.co/videos/43925/43925-720.mp4",
  "https://assets.mixkit.co/videos/42464/42464-720.mp4",
  "https://assets.mixkit.co/videos/43905/43905-720.mp4",
  "https://assets.mixkit.co/videos/1666/1666-720.mp4",
  "https://assets.mixkit.co/videos/40522/40522-720.mp4",
  "https://assets.mixkit.co/videos/4672/4672-720.mp4",
  "https://assets.mixkit.co/videos/42909/42909-720.mp4",
];

const productKey = (restaurantId: number, productId: number) => `${restaurantId}:${productId}`;

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

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [productsByRestaurant, setProductsByRestaurant] = useState<Record<number, Product[]>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [commentBumps, setCommentBumps] = useState<Record<string, number>>({});
  const [activeRestaurantIndex, setActiveRestaurantIndex] = useState(0);
  const [activeProductByRestaurant, setActiveProductByRestaurant] = useState<Record<number, number>>({});
  const [feedHeight, setFeedHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pageHeight = feedHeight || screenHeight;

  const fetchFeed = useCallback(async () => {
    const restaurantItems = await restaurantsApi.list({ ordering: "-rating" });
    const visibleRestaurants = restaurantItems.filter((item) => item.is_open !== false).slice(0, 12);
    setRestaurants(visibleRestaurants);

    const productEntries = await Promise.all(
      visibleRestaurants.map(async (restaurant) => {
        const products = await restaurantsApi.products(restaurant.id);
        return [restaurant.id, products.slice(0, 8)] as const;
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
    return restaurants.map((restaurant) => {
      const products = productsByRestaurant[restaurant.id] ?? [];
      return {
        restaurant,
        products: products.length ? products : [buildFallbackProduct(restaurant)],
      };
    });
  }, [productsByRestaurant, restaurants]);

  const activeRestaurant = feedData[activeRestaurantIndex]?.restaurant;

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
            activeProductIndex={activeProductByRestaurant[item.restaurant.id] ?? 0}
            likedPosts={likedPosts}
            commentBumps={commentBumps}
            onProductIndexChange={(productIndex) => {
              setActiveProductByRestaurant((current) => ({ ...current, [item.restaurant.id]: productIndex }));
            }}
            onOpenRestaurant={() => navigation.navigate("RestaurantDetails", { restaurant: item.restaurant })}
            onOpenProduct={(product) => navigation.navigate("ProductDetails", { restaurant: item.restaurant, product })}
            onQuickAdd={(product) => quickAdd(item.restaurant, product)}
            onLike={(product) => toggleLike(item.restaurant, product)}
            onComment={(product) => addCommentBump(item.restaurant, product)}
            onShare={(product) => shareProduct(item.restaurant, product)}
          />
        )}
        pagingEnabled
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

    </View>
  );
}

type RestaurantFeedPageProps = {
  item: FeedRestaurant;
  pageHeight: number;
  pageWidth: number;
  isActive: boolean;
  activeProductIndex: number;
  likedPosts: Record<string, boolean>;
  commentBumps: Record<string, number>;
  onProductIndexChange: (index: number) => void;
  onOpenRestaurant: () => void;
  onOpenProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onLike: (product: Product) => void;
  onComment: (product: Product) => void;
  onShare: (product: Product) => void;
};

function RestaurantFeedPage({
  item,
  pageHeight,
  pageWidth,
  isActive,
  activeProductIndex,
  likedPosts,
  commentBumps,
  onProductIndexChange,
  onOpenRestaurant,
  onOpenProduct,
  onQuickAdd,
  onLike,
  onComment,
  onShare,
}: RestaurantFeedPageProps) {
  const productViewabilityConfig = useRef({ itemVisiblePercentThreshold: 65 }).current;
  const onProductViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken<Product>> }) => {
      const next = viewableItems.find((token) => token.isViewable && token.index != null);
      if (next?.index != null) {
        onProductIndexChange(next.index);
      }
    },
  ).current;

  return (
    <View style={[styles.page, { width: pageWidth, height: pageHeight }]}>
      <FlatList
        horizontal
        data={item.products}
        keyExtractor={(product) => String(product.id)}
        renderItem={({ item: product, index }) => {
          const key = productKey(item.restaurant.id, product.id);
          return (
            <ProductVideoSlide
              restaurant={item.restaurant}
              product={product}
              index={index}
              productCount={item.products.length}
              width={pageWidth}
              height={pageHeight}
              isActive={isActive && index === activeProductIndex}
              isLiked={Boolean(likedPosts[key])}
              commentBump={commentBumps[key] ?? 0}
              onOpenRestaurant={onOpenRestaurant}
              onOpenProduct={() => onOpenProduct(product)}
              onQuickAdd={() => onQuickAdd(product)}
              onLike={() => onLike(product)}
              onComment={() => onComment(product)}
              onShare={() => onShare(product)}
            />
          );
        }}
        pagingEnabled
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
  productCount: number;
  width: number;
  height: number;
  isActive: boolean;
  isLiked: boolean;
  commentBump: number;
  onOpenRestaurant: () => void;
  onOpenProduct: () => void;
  onQuickAdd: () => void;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
};

function ProductVideoSlide({
  restaurant,
  product,
  index,
  productCount,
  width,
  height,
  isActive,
  isLiked,
  commentBump,
  onOpenRestaurant,
  onOpenProduct,
  onQuickAdd,
  onLike,
  onComment,
  onShare,
}: ProductVideoSlideProps) {
  const { tr } = useI18n();
  const insets = useSafeAreaInsets();
  const stats = statsFor(restaurant, product);
  const posterIndex = Math.abs(restaurant.id * 7 + product.id * 3 + index) % VIDEO_POSTERS.length;
  const productPrice = product.effective_price ?? product.discount_price ?? product.price;
  const posterUri = product.image ? resolveProductImageUri(product.image, product.id) : VIDEO_POSTERS[posterIndex];
  const videoUri = MOCK_VIDEO_SOURCES[(restaurant.id + product.id + index) % MOCK_VIDEO_SOURCES.length];
  const videoSource = useMemo(
    () => ({
      uri: videoUri,
      contentType: "progressive" as const,
      useCaching: true,
    }),
    [videoUri],
  );
  const restaurantPosterUri = resolveRestaurantImageUri(restaurant.cover_image, restaurant.id);
  const comments = stats.comments + commentBump;
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const player = useVideoPlayer(videoSource, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.volume = 0;
    videoPlayer.audioMixingMode = "mixWithOthers";
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

  useEffect(() => {
    setHasRenderedFrame(false);
    setHasPlaybackError(false);
  }, [videoUri]);

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
    if (!isActive) {
      player.pause();
      return undefined;
    }

    if (playerStatus !== "error" && !isPlaying) {
      player.play();
    }

    return undefined;
  }, [isActive, isPlaying, player, playerStatus]);

  return (
    <View style={[styles.slide, { width, height }]}>
      <VideoView
        player={player}
        style={[styles.videoSurface, hasPlaybackError && styles.videoSurfaceHidden]}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
        pointerEvents="none"
        surfaceType="textureView"
        useExoShutter={false}
        onFirstFrameRender={() => setHasRenderedFrame(true)}
      />
      {hasPlaybackError ? (
        <Image source={{ uri: posterUri }} style={styles.videoFallbackImage} resizeMode="cover" />
      ) : null}
      {isActive && playerStatus === "loading" && !hasPlaybackError ? (
        <View pointerEvents="none" style={styles.videoLoadingLayer}>
          <ActivityIndicator color={colors.white} />
        </View>
      ) : null}
      <View style={styles.dimLayer} />

      <Pressable style={styles.fullSlidePressable} onPress={onOpenProduct} />

      <View style={styles.productPagers} pointerEvents="none">
        {Array.from({ length: Math.min(productCount, 8) }).map((_, dotIndex) => (
          <View key={dotIndex} style={[styles.productDot, dotIndex === index && styles.productDotActive]} />
        ))}
      </View>

      <View style={styles.actionStack}>
        <SocialButton
          label={compactCount(stats.likes + (isLiked ? 1 : 0))}
          active={isLiked}
          onPress={onLike}
          icon={<Heart size={26} stroke={colors.white} fill={isLiked ? colors.red : "transparent"} />}
        />
        <SocialButton
          label={compactCount(comments)}
          onPress={onComment}
          icon={<MessageCircle size={25} stroke={colors.white} />}
        />
        <SocialButton
          label={compactCount(stats.shares)}
          onPress={onShare}
          icon={<Share2 size={25} stroke={colors.white} />}
        />
        <SocialButton
          label={tr("Trimite", "Send")}
          onPress={onShare}
          icon={<Send size={24} stroke={colors.white} />}
        />
      </View>

      <View style={styles.contentOverlay}>
        <Pressable style={styles.restaurantHeader} onPress={onOpenRestaurant}>
          <Image source={{ uri: restaurantPosterUri }} style={styles.restaurantAvatar} />
          <View style={styles.restaurantTextBlock}>
            <View style={styles.restaurantNameRow}>
              <Text numberOfLines={1} style={styles.restaurantName}>@{restaurant.slug || restaurant.name.toLowerCase().replace(/\s+/g, "")}</Text>
              <View style={styles.followPill}>
                <Text style={styles.followText}>{tr("Vezi", "View")}</Text>
              </View>
            </View>
            <Text numberOfLines={1} style={styles.restaurantMeta}>
              {Number(restaurant.rating).toFixed(1)} ★ · {restaurant.estimated_delivery_time_min}-{restaurant.estimated_delivery_time_max} min · {money(restaurant.delivery_fee)} livrare
            </Text>
          </View>
        </Pressable>

        <Pressable onPress={onOpenProduct}>
          <Text numberOfLines={2} style={styles.productTitle}>{product.name}</Text>
          <Text numberOfLines={2} style={styles.productDescription}>{product.description || restaurant.description}</Text>
        </Pressable>

        <View style={styles.tagsRow}>
          <View style={styles.tagPill}>
            <Star size={12} stroke="#111111" fill="#111111" />
            <Text style={styles.tagText}>{product.category_name ?? tr("Recomandat", "Recommended")}</Text>
          </View>
          {product.is_popular ? (
            <View style={styles.tagPillMuted}>
              <Text style={styles.tagTextMuted}>{tr("Popular", "Popular")}</Text>
            </View>
          ) : null}
        </View>

      </View>
      <View style={[styles.ctaRow, { bottom: insets.bottom + 58 }]}>
        <Pressable style={styles.orderButton} onPress={onQuickAdd}>
          <ShoppingBag size={18} stroke="#111111" />
          <Text style={styles.orderButtonText}>{tr("Adaugă", "Add")}</Text>
          <Text style={styles.orderButtonPrice}>{money(productPrice)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

type SocialButtonProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onPress: () => void;
};

function SocialButton({ icon, label, active, onPress }: SocialButtonProps) {
  return (
    <Pressable style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]} onPress={onPress}>
      <View style={[styles.socialIconWrap, active && styles.socialIconWrapActive]}>{icon}</View>
      <Text style={styles.socialLabel}>{label}</Text>
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
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  productDotActive: {
    width: 34,
    backgroundColor: colors.white,
  },
  actionStack: {
    position: "absolute",
    right: 12,
    bottom: 136,
    alignItems: "center",
    gap: 16,
    zIndex: 12,
  },
  socialButton: {
    alignItems: "center",
    gap: 5,
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
    borderColor: "transparent",
  },
  socialLabel: {
    color: colors.white,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "900",
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
    marginBottom: 13,
  },
  restaurantAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  restaurantTextBlock: {
    flex: 1,
  },
  restaurantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  restaurantName: {
    flexShrink: 1,
    color: colors.white,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
  },
  followPill: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  followText: {
    color: "#111111",
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "900",
  },
  restaurantMeta: {
    marginTop: 4,
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  productTitle: {
    marginTop: 2,
    color: colors.white,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -0.8,
    textShadowColor: "rgba(0,0,0,0.58)",
    textShadowRadius: 14,
  },
  productDescription: {
    marginTop: 6,
    paddingRight: 8,
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.62)",
    textShadowRadius: 10,
  },
  tagsRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 11,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  tagText: {
    color: "#111111",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
  },
  tagPillMuted: {
    minHeight: 28,
    paddingHorizontal: 11,
    borderRadius: 14,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.36)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  tagTextMuted: {
    color: colors.white,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
  },
  ctaRow: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 14,
  },
  orderButton: {
    width: "76%",
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.white,
  },
  orderButtonText: {
    color: "#111111",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
  },
  orderButtonPrice: {
    color: colors.red,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
  },
});
