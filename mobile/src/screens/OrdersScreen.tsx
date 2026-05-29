import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { ListOrdered, RotateCcw } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ordersApi } from "../api/ordersApi";
import { mockProducts, mockRestaurants } from "../data/mockData";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { formatDateTime } from "../lib/dateFormat";
import { money } from "../lib/format";
import { resolveProductImageUri } from "../lib/images";
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
import { Order, Product } from "../types/models";

type Props = NativeStackScreenProps<OrdersStackParamList, "OrdersHome">;
type OrderWithMedia = Order & { mockProduct?: Product };

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
  const displayOrders = Array.isArray(orders) ? (orders as OrderWithMedia[]) : [];

  const loadOrders = useCallback(
    async (mode: "initial" | "refresh" = "initial", shouldCommit: () => boolean = () => true) => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else if (useOrdersStore.getState().orders.length === 0) {
        setLoading(true);
      }

      const cachedOrders = useOrdersStore.getState().orders;
      if (mode === "initial" && cachedOrders.length > 0) {
        const normalizedCachedOrders = normalizeOrders(cachedOrders);
        const cachedMediaOrders = normalizedCachedOrders as OrderWithMedia[];
        const hasMissingMedia = cachedMediaOrders.some((order) => !order.mockProduct);
        const hasLegacyDemoOrders = normalizedCachedOrders.some((order) => demoOrderConfigs.some((config) => config.id === order.id));

        if (hasLegacyDemoOrders && hasMissingMedia) {
          setOrders(MOCK_ORDERS);
        } else if (hasMissingMedia) {
          setOrders(enrichOrdersWithFeedMedia(normalizedCachedOrders));
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
          ) : displayOrders.length ? (
            <View style={[styles.list, { borderTopColor: separatorColor }]} pointerEvents="box-none">
              {displayOrders.map((order, index) => (
                <Pressable
                  key={order.id ?? `order-${index}`}
                  style={({ pressed }) => [styles.order, { borderBottomColor: separatorColor }, pressed && styles.pressed]}
                  onPress={() => navigation.navigate("OrderDetails", { order: stripFeedMedia(order) })}
                >
                  {order.mockProduct ? (
                    <OrderImageThumb product={order.mockProduct} />
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
                    <Text style={styles.meta}>
                      {formatOrderMeta(String(order.created_at ?? ""), order.order_status, language === "en" ? "en-US" : "ro-RO", tr)}
                    </Text>
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

function OrderImageThumb({
  product,
}: {
  product: Product;
}) {
  const imageSource = { uri: resolveProductImageUri(product.image, product.id) };

  return (
    <View style={styles.orderThumbImageWrap} pointerEvents="none">
      <Image
        source={imageSource}
        style={styles.orderThumbImage}
        resizeMode="cover"
      />
    </View>
  );
}

function stripFeedMedia(order: OrderWithMedia): Order {
  const { mockProduct: _mockProduct, ...safeOrder } = order;
  return safeOrder;
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
  locale: "ro-RO" | "en-US",
  tr: (ro: string, en: string) => string,
) {
  const formattedDate = formatDateTime(createdAt, locale, tr("Dată necunoscută", "Unknown date"));
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

function normalizeOrders(orders: unknown): Order[] {
  if (!Array.isArray(orders)) return [];

  return orders
    .filter((order) => order && typeof order === "object")
    .map((order) => {
      const safeOrder = order as Partial<Order>;

      return {
        ...safeOrder,
        id: Number.isFinite(Number(safeOrder.id)) ? Number(safeOrder.id) : 0,
        restaurant: Number.isFinite(Number(safeOrder.restaurant)) ? Number(safeOrder.restaurant) : 0,
        restaurant_name: safeRestaurantName(safeOrder.restaurant_name),
        created_at: typeof safeOrder.created_at === "string" ? safeOrder.created_at : "",
        subtotal: Number.isFinite(Number(safeOrder.subtotal)) ? Number(safeOrder.subtotal) : 0,
        delivery_fee: Number.isFinite(Number(safeOrder.delivery_fee)) ? Number(safeOrder.delivery_fee) : 0,
        discount: Number.isFinite(Number(safeOrder.discount)) ? Number(safeOrder.discount) : 0,
        total: Number.isFinite(Number(safeOrder.total)) ? Number(safeOrder.total) : 0,
        payment_method: safeOrder.payment_method ?? "cash",
        order_status: safeOrder.order_status ?? "pending",
        items: Array.isArray(safeOrder.items) ? safeOrder.items : [],
      } as Order;
    });
}

function enrichOrdersWithFeedMedia(orders: Order[]): OrderWithMedia[] {
  return orders.map((order) => {
    const firstProductId = Array.isArray(order.items) ? order.items[0]?.product : undefined;
    const product = mockProducts.find((item) => item.id === firstProductId);

    return {
      ...order,
      mockProduct: product,
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
  orderThumbImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.cardSoft,
  },
  orderThumbImage: {
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
