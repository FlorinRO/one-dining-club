import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { ListOrdered, RotateCcw } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ordersApi } from "../api/ordersApi";
import { getDemoProductVideoSource } from "../data/demoVideos";
import { mockProducts, mockRestaurants } from "../data/mockData";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { money } from "../lib/format";
import { OrdersStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { useOrdersStore } from "../store/ordersStore";
import { colors } from "../theme/colors";
import {
  BURGER_BACKGROUND_IMAGE,
  FOOD_BACKGROUND_BLUR_RADIUS,
  FOOD_BACKGROUND_GRADIENT_COLORS,
  FOOD_BACKGROUND_GRADIENT_LOCATIONS,
  FOOD_BACKGROUND_IMAGE_OPACITY,
  FOOD_BACKGROUND_IMAGE_SCALE,
} from "../theme/foodBackground";
import { Order, Product, Restaurant } from "../types/models";

type Props = NativeStackScreenProps<OrdersStackParamList, "OrdersHome">;
type OrderWithMedia = Order & { mockProduct?: Product; mockRestaurant?: Restaurant };

export function OrdersScreen({ navigation }: Props) {
  const { tr, language } = useI18n();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const separatorColor = colorScheme === "dark" ? "#1A1A1A" : colors.border;
  const orders = useOrdersStore((state) => state.orders);
  const setOrders = useOrdersStore((state) => state.setOrders);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();

  const loadOrders = useCallback(
    async (mode: "initial" | "refresh" = "initial", shouldCommit: () => boolean = () => true) => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else if (useOrdersStore.getState().orders.length === 0) {
        setLoading(true);
      }

      const cachedOrders = useOrdersStore.getState().orders;
      if (mode === "initial" && cachedOrders.length > 0) {
        const cachedMediaOrders = cachedOrders as OrderWithMedia[];
        const hasMissingMedia = cachedMediaOrders.some((order) => !order.mockProduct || !order.mockRestaurant);
        const hasLegacyDemoOrders = cachedOrders.some((order) => demoOrderConfigs.some((config) => config.id === order.id));

        if (hasLegacyDemoOrders && hasMissingMedia) {
          setOrders(MOCK_ORDERS);
        } else if (hasMissingMedia) {
          setOrders(enrichOrdersWithFeedMedia(cachedOrders));
        }

        setLoading(false);
        setRefreshing(false);
        return;
      }

      setError(null);

      if (!accessToken) {
        if (!shouldCommit()) return;
        if (useOrdersStore.getState().orders.length === 0) {
          setOrders(MOCK_ORDERS);
        }
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const data = await ordersApi.list();
        if (!shouldCommit()) return;
        const safeOrders = enrichOrdersWithFeedMedia(normalizeOrders(data));
        setOrders(safeOrders.length ? safeOrders : MOCK_ORDERS);
      } catch (orderError) {
        if (!shouldCommit()) return;
        setOrders(MOCK_ORDERS);
        if (!isAuthError(orderError)) {
          setError(tr("Backend indisponibil acum. Afișăm comenzi demo pentru UI.", "Backend unavailable right now. Showing demo orders for UI."));
        }
      } finally {
        if (shouldCommit()) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, setOrders, tr],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      loadOrders("initial", () => isActive);

      return () => {
        isActive = false;
        setLoading(false);
        setRefreshing(false);
      };
    }, [loadOrders]),
  );

  return (
    <View style={styles.root}>
      <Image source={BURGER_BACKGROUND_IMAGE} style={styles.backgroundImage} resizeMode="cover" blurRadius={FOOD_BACKGROUND_BLUR_RADIUS} />
      <LinearGradient
        pointerEvents="none"
        colors={FOOD_BACKGROUND_GRADIENT_COLORS}
        locations={FOOD_BACKGROUND_GRADIENT_LOCATIONS}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        onScroll={trackFloatingCartScrollDirection}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={() => loadOrders("refresh")} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 22, paddingBottom: Math.max(insets.bottom, 18) + 86 }]}
      >
        <Text style={styles.title}>{tr("Comenzile mele", "My orders")}</Text>

          {error && <Text style={styles.errorBanner}>{error}</Text>}

          {loading ? (
            <View style={[styles.list, { borderTopColor: separatorColor }]} pointerEvents="none">
              {Array.from({ length: 4 }).map((_, index) => (
                <View key={`orders-skeleton-${index}`} style={[styles.order, { borderBottomColor: separatorColor }]}>
                  <View style={styles.orderThumbSkeleton} />
                  <View style={styles.main}>
                    <View style={styles.restaurantSkeleton} />
                    <View style={styles.totalSkeleton} />
                    <View style={styles.metaSkeleton} />
                  </View>
                  <View style={styles.trailingButtonSkeleton} />
                </View>
              ))}
            </View>
          ) : orders.length ? (
            <View style={[styles.list, { borderTopColor: separatorColor }]} pointerEvents="box-none">
              {(orders as OrderWithMedia[]).map((order, index) => (
                <Pressable
                  key={order.id}
                  style={({ pressed }) => [styles.order, { borderBottomColor: separatorColor }, pressed && styles.pressed]}
                  onPress={() => navigation.navigate("OrderDetails", { order })}
                >
                  {order.mockProduct && order.mockRestaurant ? (
                    <OrderVideoThumb product={order.mockProduct} restaurant={order.mockRestaurant} fallbackIndex={index} />
                  ) : (
                    <View style={styles.orderThumb}>
                      <Text style={styles.orderThumbText}>{restaurantInitials(order.restaurant_name)}</Text>
                    </View>
                  )}
                  <View style={styles.main}>
                    <Text style={styles.restaurant} numberOfLines={1}>
                      {safeRestaurantName(order.restaurant_name)}
                    </Text>
                    <Text style={styles.total}>{money(order.total)}</Text>
                    <Text style={styles.meta}>{formatOrderMeta(order.created_at, order.order_status, language === "en" ? "en-US" : "ro-RO", tr)}</Text>
                  </View>
                  <View style={styles.trailingButton}>
                    <RotateCcw size={20} color={colors.text} strokeWidth={2} />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <ListOrdered size={28} color={colors.red} strokeWidth={2.2} />
              <Text style={styles.emptyTitle}>{tr("Nu ai comenzi încă", "No orders yet")}</Text>
              <Text style={styles.emptyText}>{tr("După prima comandă plasată cu backend-ul, istoricul apare aici.", "After your first backend order, history will show up here.")}</Text>
            </View>
          )}
      </ScrollView>
    </View>
  );
}

function OrderVideoThumb({
  product,
  restaurant,
  fallbackIndex,
}: {
  product: Product;
  restaurant: Restaurant;
  fallbackIndex: number;
}) {
  const videoSource = useMemo<VideoSource>(
    () =>
      product.video_url
        ? {
            uri: product.video_url,
            contentType: "progressive",
            useCaching: false,
          }
        : getDemoProductVideoSource({ product, restaurant, fallbackIndex }),
    [fallbackIndex, product, restaurant],
  );
  const player = useVideoPlayer(videoSource, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.volume = 0;
    videoPlayer.audioMixingMode = "duckOthers";
  });

  useEffect(() => {
    try {
      player.play();
    } catch {
      // Keep the row usable even if native playback cannot start immediately.
    }

    return () => {
      try {
        player.pause();
      } catch {
        // Ignore native cleanup failures for tiny autoplay thumbnails.
      }
    };
  }, [player]);

  return (
    <View style={styles.orderThumbVideoWrap} pointerEvents="none">
      <VideoView
        player={player}
        style={styles.orderThumbVideo}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
        playsInline
        surfaceType="textureView"
        useExoShutter={false}
      />
    </View>
  );
}

function safeRestaurantName(name: string | null | undefined) {
  const value = typeof name === "string" ? name.trim() : "";
  return value || "ONE Dining Club";
}

function restaurantInitials(name: string | null | undefined) {
  return (
    safeRestaurantName(name)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "OD"
  );
}

function formatOrderMeta(
  createdAt: string,
  status: Order["order_status"],
  locale: string,
  tr: (ro: string, en: string) => string,
) {
  const parsedDate = new Date(createdAt);
  const formattedDate = Number.isNaN(parsedDate.getTime())
    ? tr("Dată necunoscută", "Unknown date")
    : new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
  return `${formattedDate} · ${statusLabel(status, tr)}`;
}

function isAuthError(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}

function statusLabel(status: Order["order_status"], tr: (ro: string, en: string) => string) {
  if (status === "delivered") return tr("Livrată", "Delivered");
  if (status === "on_the_way") return tr("În livrare", "On the way");
  if (status === "preparing") return tr("În preparare", "Preparing");
  if (status === "cancelled") return tr("Anulată", "Cancelled");
  return tr("Plasată", "Placed");
}

function normalizeOrders(orders: Order[]): Order[] {
  return orders
    .filter((order) => order && typeof order === "object")
    .map((order) => ({
      ...order,
      restaurant_name: safeRestaurantName(order.restaurant_name),
      created_at: typeof order.created_at === "string" ? order.created_at : "",
      total: Number.isFinite(Number(order.total)) ? Number(order.total) : 0,
      items: Array.isArray(order.items) ? order.items : [],
    }));
}

function enrichOrdersWithFeedMedia(orders: Order[]): OrderWithMedia[] {
  return orders.map((order) => {
    const firstProductId = order.items[0]?.product;
    const product = mockProducts.find((item) => item.id === firstProductId);
    const restaurant = product
      ? mockRestaurants.find((item) => item.id === product.restaurant)
      : mockRestaurants.find((item) => item.id === order.restaurant);

    return {
      ...order,
      mockProduct: product,
      mockRestaurant: restaurant,
    };
  });
}

const demoOrderConfigs: Array<{
  id: number;
  productIds: number[];
  deliveryFee: number;
  discount: number;
  paymentMethod: Order["payment_method"];
  status: Order["order_status"];
  createdAt: string;
}> = [
  {
    id: 9012,
    productIds: [101, 102],
    deliveryFee: 9.99,
    discount: 10,
    paymentMethod: "card",
    status: "delivered",
    createdAt: "2026-05-10T12:04:00Z",
  },
  {
    id: 9011,
    productIds: [302, 301],
    deliveryFee: 11,
    discount: 0,
    paymentMethod: "cash",
    status: "delivered",
    createdAt: "2026-05-02T19:14:00Z",
  },
  {
    id: 9008,
    productIds: [201, 202],
    deliveryFee: 7.5,
    discount: 4,
    paymentMethod: "card",
    status: "on_the_way",
    createdAt: "2026-04-18T20:45:00Z",
  },
  {
    id: 9003,
    productIds: [301, 302],
    deliveryFee: 11,
    discount: 6,
    paymentMethod: "card",
    status: "preparing",
    createdAt: "2026-03-27T13:03:00Z",
  },
];

const MOCK_ORDERS: OrderWithMedia[] = demoOrderConfigs.map((config) => {
  const products = config.productIds
    .map((productId) => mockProducts.find((product) => product.id === productId))
    .filter((product): product is Product => Boolean(product));
  const primaryProduct = products[0] ?? mockProducts[0];
  const restaurant =
    mockRestaurants.find((item) => item.id === primaryProduct.restaurant) ??
    mockRestaurants.find((item) => item.id === Number(primaryProduct.restaurant)) ??
    mockRestaurants[0];
  const items = products.map((product, index) => {
    const unitPrice = Number(product.effective_price ?? product.discount_price ?? product.price) || 0;
    return {
      id: config.id * 10 + index,
      product: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: unitPrice,
      total_price: unitPrice,
    };
  });
  const subtotal = items.reduce((total, item) => total + Number(item.total_price), 0);
  const total = Number((subtotal + config.deliveryFee - config.discount).toFixed(2));

  return {
    id: config.id,
    restaurant: restaurant.id,
    restaurant_name: restaurant.name,
    subtotal,
    delivery_fee: config.deliveryFee,
    discount: config.discount,
    total,
    payment_method: config.paymentMethod,
    order_status: config.status,
    created_at: config.createdAt,
    items,
    address: 1,
    mockProduct: primaryProduct,
    mockRestaurant: restaurant,
  };
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050505",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: FOOD_BACKGROUND_IMAGE_OPACITY,
    transform: [{ scale: FOOD_BACKGROUND_IMAGE_SCALE }],
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  content: {
    paddingHorizontal: 22,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700",
  },
  errorBanner: {
    borderRadius: 14,
    backgroundColor: "#FFF1F1",
    color: colors.redDark,
    padding: 10,
    marginBottom: 14,
    fontSize: 13,
    fontWeight: "600",
  },
  list: {
    marginTop: 34,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  order: {
    minHeight: 108,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderThumb: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red,
  },
  orderThumbVideoWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.cardSoft,
  },
  orderThumbVideo: {
    width: "100%",
    height: "100%",
  },
  orderThumbSkeleton: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.cardSoft,
    opacity: 0.9,
  },
  orderThumbText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 18,
  },
  main: {
    flex: 1,
    gap: 3,
  },
  restaurant: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  restaurantSkeleton: {
    width: "72%",
    height: 14,
    borderRadius: 8,
    backgroundColor: colors.cardSoft,
    opacity: 0.9,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "400",
  },
  total: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  totalSkeleton: {
    width: "40%",
    height: 12,
    borderRadius: 8,
    backgroundColor: colors.cardSoft,
    opacity: 0.8,
  },
  metaSkeleton: {
    width: "58%",
    height: 10,
    borderRadius: 8,
    backgroundColor: colors.cardSoft,
    opacity: 0.7,
  },
  trailingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  trailingButtonSkeleton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardSoft,
    opacity: 0.85,
  },
  emptyBox: {
    minHeight: 190,
    borderRadius: 20,
    padding: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.muted,
    textAlign: "center",
    lineHeight: 21,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.86,
  },
});
