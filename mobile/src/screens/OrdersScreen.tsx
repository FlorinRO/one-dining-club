import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ListOrdered, RefreshCcw } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FoodBackground } from "../components/FoodBackground";
import { ordersApi } from "../api/ordersApi";
import { productsApi } from "../api/productsApi";
import { Screen } from "../components/Screen";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { formatDateTime } from "../lib/dateFormat";
import { resolveProductImageUri } from "../lib/images";
import { OrdersStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { useOrdersStore } from "../store/ordersStore";
import { colors } from "../theme/colors";
import { Order, OrderStatus, Product } from "../types/models";

type Props = NativeStackScreenProps<OrdersStackParamList, "OrdersHome">;

type SafeOrder = Order & {
  id: number;
  restaurant_name: string;
  created_at: string;
  total: number;
  order_status: OrderStatus;
};

type OrderRow = {
  order: SafeOrder;
  product?: Product;
  productLine: string;
  imageUri?: string;
};

const ORDER_ROW_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1625398407796-82650a8c135f?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1557872943-16a5ac26437e?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1526318896980-cf78c088247c?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1565299585323-38174c4a6471?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=1000&auto=format&fit=crop",
];

export function OrdersScreen({ navigation }: Props) {
  const { tr, language } = useI18n();
  const insets = useSafeAreaInsets();
  const topOverlayHeight = insets.top + 1;
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();

  const storeOrders = useOrdersStore((state) => state.orders);
  const setOrders = useOrdersStore((state) => state.setOrders);
  const accessToken = useAuthStore((state) => state.accessToken);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const safeOrders = useMemo(() => sanitizeOrders(storeOrders), [storeOrders]);
  const displayOrders = useMemo(() => (safeOrders.length ? safeOrders : buildDemoOrders(products)), [products, safeOrders]);
  const orderRows = useMemo(() => buildOrderRows(displayOrders, products), [displayOrders, products]);

  const loadOrders = useCallback(
    async (mode: "initial" | "refresh", shouldCommit: () => boolean) => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage(null);

      try {
        const productsData = await productsApi.list();
        if (!shouldCommit()) return;
        setProducts(productsData);

        if (!accessToken) {
          setOrders([]);
          return;
        }

        const ordersData = await ordersApi.list();
        if (!shouldCommit()) return;
        setOrders(sanitizeOrders(ordersData));
      } catch {
        if (!shouldCommit()) return;
        setErrorMessage(tr("Nu am putut încărca comenzile. Încearcă din nou.", "Could not load your orders. Please try again."));
      } finally {
        if (!shouldCommit()) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, setOrders, tr],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadOrders("initial", () => active);

      return () => {
        active = false;
      };
    }, [loadOrders]),
  );

  return (
    <Screen padded={false} edges={["left", "right"]}>
      <View style={styles.page}>
        <FoodBackground />
        <View pointerEvents="none" style={[styles.statusBarMask, { height: topOverlayHeight }]} />
        {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

        <FlatList
          data={orderRows}
          keyExtractor={(item) => String(item.order.id)}
          showsVerticalScrollIndicator={false}
          onScroll={trackFloatingCartScrollDirection}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={() => loadOrders("refresh", () => true)} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: topOverlayHeight + 12, paddingBottom: Math.max(insets.bottom, 16) + 90 },
            orderRows.length === 0 ? styles.emptyListContent : null,
          ]}
          ListHeaderComponent={
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{tr("Comenzile mele", "My Orders")}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <OrderListRow
              order={item.order}
              productLine={item.productLine}
              imageUri={item.imageUri}
              language={language}
              tr={tr}
              onPress={() => navigation.navigate("OrderDetails", { order: item.order })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconWrap}>
                <ListOrdered size={24} color={colors.red} strokeWidth={2.2} />
              </View>
              <Text style={styles.emptyTitle}>{loading ? tr("Încărcăm comenzile...", "Loading orders...") : tr("Nu ai comenzi încă", "No orders yet")}</Text>
              <Text style={styles.emptySubtitle}>
                {loading
                  ? tr("Așteaptă câteva secunde.", "Please wait a few seconds.")
                  : tr("După prima comandă, istoricul va apărea aici.", "After your first order, your history will appear here.")}
              </Text>
              {!loading ? (
                <Pressable style={styles.retryButton} onPress={() => loadOrders("refresh", () => true)}>
                  <RefreshCcw size={16} color={colors.white} strokeWidth={2.3} />
                  <Text style={styles.retryButtonText}>{tr("Reîncearcă", "Retry")}</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      </View>
    </Screen>
  );
}

function sanitizeOrders(input: unknown): SafeOrder[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const maybeOrder = item as Partial<Order>;

      const id = typeof maybeOrder.id === "number" ? maybeOrder.id : index + 1;
      const restaurantName = typeof maybeOrder.restaurant_name === "string" && maybeOrder.restaurant_name.trim() ? maybeOrder.restaurant_name.trim() : "YUMZY";
      const createdAt = typeof maybeOrder.created_at === "string" && maybeOrder.created_at ? maybeOrder.created_at : new Date().toISOString();
      const total = toNumber(maybeOrder.total);
      const orderStatus = normalizeStatus(maybeOrder.order_status);

      return {
        ...(maybeOrder as Order),
        id,
        restaurant_name: restaurantName,
        created_at: createdAt,
        total,
        order_status: orderStatus,
      } as SafeOrder;
    })
    .filter((order): order is SafeOrder => Boolean(order))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(status: unknown): OrderStatus {
  const knownStatuses: OrderStatus[] = ["pending", "accepted", "preparing", "ready_for_pickup", "picked_up", "on_the_way", "delivered", "cancelled", "rejected"];
  return knownStatuses.includes(status as OrderStatus) ? (status as OrderStatus) : "pending";
}

function money(value: number) {
  return `${value.toFixed(2).replace(".", ",")} lei`;
}

function productPrice(product: Product) {
  return toNumber(product.effective_price ?? product.discount_price ?? product.price);
}

function productImageUri(product: Product) {
  return resolveProductImageUri(product.image, product.id);
}

function normalizeProductName(product: Product) {
  return product.name.trim().toLowerCase();
}

function imageVisualKey(uri: string) {
  try {
    const parsed = new URL(uri);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return uri.split("?")[0];
  }
}

function uniqueProductsByName(products: Product[]) {
  const usedIds = new Set<number>();
  const usedNames = new Set<string>();

  return products.filter((product) => {
    if (!product || typeof product.id !== "number" || !product.name.trim()) return false;

    const name = normalizeProductName(product);
    if (usedIds.has(product.id) || usedNames.has(name)) return false;

    usedIds.add(product.id);
    usedNames.add(name);
    return true;
  });
}

function orderProductIds(order: SafeOrder) {
  return (Array.isArray(order.items) ? order.items : [])
    .map((item) => item?.product)
    .filter((productId): productId is number => typeof productId === "number");
}

function pickUniqueProduct(candidates: Product[], usedProductIds: Set<number>, usedImageKeys: Set<string>, usedProductNames: Set<string>) {
  const cleanCandidates = candidates.filter(Boolean);

  return (
    cleanCandidates.find((product) => {
      const imageKey = imageVisualKey(productImageUri(product));
      const name = normalizeProductName(product);
      return !usedProductIds.has(product.id) && !usedImageKeys.has(imageKey) && !usedProductNames.has(name);
    }) ??
    cleanCandidates.find((product) => {
      const name = normalizeProductName(product);
      return !usedProductIds.has(product.id) && !usedProductNames.has(name);
    })
  );
}

function uniqueOrderImageUri(product: Product | undefined, usedImageKeys: Set<string>, fallbackIndex: number) {
  if (product) {
    const productUri = productImageUri(product);
    const productImageKey = imageVisualKey(productUri);
    if (!usedImageKeys.has(productImageKey)) return productUri;
  }

  for (let offset = 0; offset < ORDER_ROW_IMAGE_POOL.length; offset += 1) {
    const fallbackUri = ORDER_ROW_IMAGE_POOL[(fallbackIndex + offset) % ORDER_ROW_IMAGE_POOL.length];
    const fallbackKey = imageVisualKey(fallbackUri);
    if (!usedImageKeys.has(fallbackKey)) return fallbackUri;
  }

  return product ? productImageUri(product) : undefined;
}

function buildOrderRows(orders: SafeOrder[], products: Product[]): OrderRow[] {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const uniqueProducts = uniqueProductsByName(products);
  const usedProductIds = new Set<number>();
  const usedImageKeys = new Set<string>();
  const usedProductNames = new Set<string>();

  return orders.map((order, index) => {
    const orderProducts = orderProductIds(order)
      .map((productId) => productsById.get(productId))
      .filter((product): product is Product => Boolean(product));
    const restaurantProducts = uniqueProducts.filter((product) => product.restaurant === order.restaurant);
    const product = pickUniqueProduct([...orderProducts, ...restaurantProducts, ...uniqueProducts], usedProductIds, usedImageKeys, usedProductNames);
    const imageUri = uniqueOrderImageUri(product, usedImageKeys, index);

    if (product) {
      usedProductIds.add(product.id);
      usedProductNames.add(normalizeProductName(product));
    }
    if (imageUri) {
      usedImageKeys.add(imageVisualKey(imageUri));
    }

    return {
      order,
      product,
      imageUri,
      productLine: orderProductLine(order, product),
    };
  });
}

function buildDemoOrders(products: Product[]): SafeOrder[] {
  const demoProducts = uniqueProductsByName(products).slice(0, 5);
  const statuses: OrderStatus[] = ["delivered", "on_the_way", "preparing", "delivered", "accepted"];
  const createdDates = [
    "2026-05-29T18:30:00Z",
    "2026-05-26T12:15:00Z",
    "2026-05-21T20:45:00Z",
    "2026-05-17T13:05:00Z",
    "2026-05-12T19:20:00Z",
  ];

  return demoProducts.map((product, index) => {
    const subtotal = productPrice(product);
    const deliveryFee = index % 2 === 0 ? 9.99 : 7.5;
    const discount = index === 0 ? 0 : index % 2 === 0 ? 5 : 0;
    const total = Number((subtotal + deliveryFee - discount).toFixed(2));

    return {
      id: 90000 + product.id,
      restaurant: product.restaurant,
      restaurant_name: product.restaurant_name ?? "YUMZY",
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      total,
      payment_method: index % 2 === 0 ? "card" : "cash",
      order_status: statuses[index] ?? "delivered",
      created_at: createdDates[index] ?? createdDates[0],
      address: 1,
      items: [
        {
          id: 91000 + product.id,
          product: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: subtotal,
          total_price: subtotal,
        },
      ],
    };
  });
}

function orderProductLine(order: SafeOrder, product?: Product) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (product) {
    const isOrderProduct = items.some((item) => item.product === product.id);
    if (isOrderProduct && items.length > 1) return `${product.name} +${items.length - 1}`;
    return product.name;
  }

  if (!items.length) return "";
  const firstName = items[0]?.product_name?.trim() || "";
  if (!firstName) return "";
  if (items.length === 1) return firstName;
  return `${firstName} +${items.length - 1}`;
}

function OrderListRow({
  order,
  productLine,
  imageUri,
  language,
  tr,
  onPress,
}: {
  order: SafeOrder;
  productLine: string;
  imageUri?: string;
  language: string;
  tr: (ro: string, en: string) => string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.mediaWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.media} resizeMode="cover" />
        ) : (
          <View style={[styles.media, styles.mediaFallback]} />
        )}
      </View>

      <View style={styles.rowCopy}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {order.restaurant_name}
        </Text>
        <Text style={styles.totalValue}>{money(order.total)}</Text>
        <Text style={styles.metaText} numberOfLines={1}>
          {formatDateTime(order.created_at, language === "en" ? "en-US" : "ro-RO", "-")} • {statusLabel(order.order_status, tr)}
        </Text>
        {productLine ? (
          <Text style={styles.productLine} numberOfLines={1}>
            {productLine}
          </Text>
        ) : null}
      </View>

      <View style={styles.reorderCircle}>
        <RefreshCcw size={18} color={colors.white} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

function statusLabel(status: OrderStatus, tr: (ro: string, en: string) => string) {
  if (status === "delivered") return tr("Livrată", "Delivered");
  if (status === "on_the_way" || status === "picked_up") return tr("În livrare", "On the way");
  if (status === "preparing" || status === "accepted" || status === "ready_for_pickup") return tr("În preparare", "Preparing");
  if (status === "cancelled" || status === "rejected") return tr("Anulată", "Cancelled");
  return tr("Plasată", "Placed");
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  statusBarMask: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 20,
    backgroundColor: "#000000",
  },
  titleBlock: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "600",
    color: colors.white,
    letterSpacing: -0.4,
  },
  productLine: {
    marginTop: 2,
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "400",
  },
  errorBanner: {
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: -4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.dangerSoft,
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 18,
    gap: 0,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  row: {
    minHeight: 112,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowPressed: {
    opacity: 0.84,
  },
  mediaWrap: {
    width: 78,
    height: 78,
    borderRadius: 18,
    overflow: "hidden",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  mediaFallback: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  restaurantName: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "400",
  },
  metaText: {
    marginTop: 2,
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "400",
  },
  totalValue: {
    marginTop: 1,
    color: colors.white,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "400",
  },
  reorderCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 10,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
    marginBottom: 4,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.red,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
});
