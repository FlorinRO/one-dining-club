import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { ListOrdered, RotateCcw } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ordersApi } from "../api/ordersApi";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { money } from "../lib/format";
import { OrdersStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { useOrdersStore } from "../store/ordersStore";
import { colors } from "../theme/colors";
import { Order } from "../types/models";

type Props = NativeStackScreenProps<OrdersStackParamList, "OrdersHome">;
type OrderWithMedia = Order & { mockImage?: string; mockVideoUrl?: string };
const SEARCH_BACKGROUND_IMAGE = require("../../assets/food-src/food3.jpg");

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
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      if (!accessToken) {
        setOrders(MOCK_ORDERS);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const data = await ordersApi.list();
        const safeOrders = normalizeOrders(data);
        setOrders(safeOrders.length ? safeOrders : MOCK_ORDERS);
      } catch (orderError) {
        setOrders(MOCK_ORDERS);
        if (!isAuthError(orderError)) {
          setError(tr("Backend indisponibil acum. Afișăm comenzi demo pentru UI.", "Backend unavailable right now. Showing demo orders for UI."));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, setOrders, tr],
  );

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  return (
    <View style={styles.root}>
      <Image source={SEARCH_BACKGROUND_IMAGE} style={styles.backgroundImage} resizeMode="cover" blurRadius={24} />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(5,5,5,0.34)", "rgba(5,5,5,0.58)", "rgba(5,5,5,0.86)"]}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
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
              {(orders as OrderWithMedia[]).map((order) => (
                <Pressable
                  key={order.id}
                  style={({ pressed }) => [styles.order, { borderBottomColor: separatorColor }, pressed && styles.pressed]}
                  onPress={() => navigation.navigate("OrderDetails", { order })}
                >
                  {order.mockVideoUrl ? (
                    <OrderVideoThumb uri={order.mockVideoUrl} />
                  ) : order.mockImage ? (
                    <Image source={{ uri: order.mockImage }} style={styles.orderThumbImage} />
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

function OrderVideoThumb({ uri }: { uri: string }) {
  const videoSource = useMemo(
    () => ({
      uri,
      contentType: "progressive" as const,
      useCaching: false,
    }),
    [uri],
  );
  const player = useVideoPlayer(videoSource, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.volume = 0;
  });

  useEffect(() => {
    try {
      player.play();
    } catch {
      // Thumbnail remains visually stable if native playback cannot start.
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
      <VideoView player={player} style={styles.orderThumbVideo} contentFit="cover" nativeControls={false} />
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

const MOCK_ORDERS: OrderWithMedia[] = [
  {
    id: 9012,
    restaurant: 23,
    restaurant_name: "Gelato Stories",
    subtotal: 30,
    delivery_fee: 5,
    discount: 0,
    total: 35,
    payment_method: "card",
    order_status: "delivered",
    created_at: "2026-05-25T12:04:00Z",
    mockVideoUrl: "https://assets.mixkit.co/videos/10434/10434-1080.mp4",
    items: [
      { id: 1, product: 223, product_name: "Berry Cheesecake Cup", quantity: 1, unit_price: 30, total_price: 30 },
    ],
    address: 1,
  },
  {
    id: 9011,
    restaurant: 22,
    restaurant_name: "Bao Pop Studio",
    subtotal: 31,
    delivery_fee: 5,
    discount: 0,
    total: 36,
    payment_method: "cash",
    order_status: "delivered",
    created_at: "2026-05-18T19:14:00Z",
    mockVideoUrl: "https://assets.mixkit.co/videos/41350/41350-1080.mp4",
    items: [
      { id: 3, product: 212, product_name: "Crispy Tofu Bao", quantity: 1, unit_price: 31, total_price: 31 },
    ],
    address: 1,
  },
  {
    id: 9008,
    restaurant: 21,
    restaurant_name: "Smokehouse Loop",
    subtotal: 29,
    delivery_fee: 6,
    discount: 0,
    total: 35,
    payment_method: "card",
    order_status: "delivered",
    created_at: "2026-05-08T20:45:00Z",
    mockVideoUrl: "https://assets.mixkit.co/videos/2774/2774-1080.mp4",
    items: [
      { id: 5, product: 201, product_name: "Brisket Burnt Ends Box", quantity: 1, unit_price: 29, total_price: 29 },
    ],
    address: 1,
  },
  {
    id: 9003,
    restaurant: 20,
    restaurant_name: "Bowl Motion",
    subtotal: 33,
    delivery_fee: 4,
    discount: 0,
    total: 37,
    payment_method: "card",
    order_status: "preparing",
    created_at: "2026-05-02T13:03:00Z",
    mockVideoUrl: "https://assets.mixkit.co/videos/40531/40531-1080.mp4",
    items: [
      { id: 7, product: 196, product_name: "Beetroot Feta Energy Bowl", quantity: 1, unit_price: 33, total_price: 33 },
    ],
    address: 1,
  },
  {
    id: 8999,
    restaurant: 5,
    restaurant_name: "Dolce Notte",
    subtotal: 33,
    delivery_fee: 5,
    discount: 3,
    total: 35,
    payment_method: "card",
    order_status: "on_the_way",
    created_at: "2026-04-24T18:28:00Z",
    mockVideoUrl: "https://assets.mixkit.co/videos/43925/43925-1080.mp4",
    items: [
      { id: 10, product: 44, product_name: "Crispy Schnitzel dolce-notte", quantity: 1, unit_price: 33, total_price: 33 },
    ],
    address: 1,
  },
];

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
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
  orderThumbImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.cardSoft,
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
