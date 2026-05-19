import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ListOrdered, RotateCcw } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";

import { ordersApi } from "../api/ordersApi";
import { Screen } from "../components/Screen";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { money } from "../lib/format";
import { OrdersStackParamList } from "../navigation/types";
import { useOrdersStore } from "../store/ordersStore";
import { colors } from "../theme/colors";
import { Order } from "../types/models";

type Props = NativeStackScreenProps<OrdersStackParamList, "OrdersHome">;
type OrderWithImage = Order & { mockImage?: string };

export function OrdersScreen({ navigation }: Props) {
  const { tr, language } = useI18n();
  const colorScheme = useColorScheme();
  const separatorColor = colorScheme === "dark" ? "#1A1A1A" : colors.border;
  const orders = useOrdersStore((state) => state.orders);
  const setOrders = useOrdersStore((state) => state.setOrders);
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

      try {
        const data = await ordersApi.list();
        setOrders(data.length ? data : MOCK_ORDERS);
      } catch {
        setOrders(MOCK_ORDERS);
        setError(tr("Backend indisponibil acum. Afișăm comenzi demo pentru UI.", "Backend unavailable right now. Showing demo orders for UI."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setOrders],
  );

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={trackFloatingCartScrollDirection}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={() => loadOrders("refresh")} />}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>{tr("Comenzile mele", "My orders")}</Text>

        {error && <Text style={styles.errorBanner}>{error}</Text>}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.red} />
            <Text style={styles.mutedText}>{tr("Se încarcă comenzile...", "Loading orders...")}</Text>
          </View>
        ) : orders.length ? (
          <View style={[styles.list, { borderTopColor: separatorColor }]} pointerEvents="box-none">
            {(orders as OrderWithImage[]).map((order) => (
              <Pressable
                key={order.id}
                style={({ pressed }) => [styles.order, { borderBottomColor: separatorColor }, pressed && styles.pressed]}
                onPress={() => navigation.navigate("OrderDetails", { order })}
              >
                {order.mockImage ? (
                  <Image source={{ uri: order.mockImage }} style={styles.orderThumbImage} />
                ) : (
                  <View style={styles.orderThumb}>
                    <Text style={styles.orderThumbText}>{restaurantInitials(order.restaurant_name)}</Text>
                  </View>
                )}
                <View style={styles.main}>
                  <Text style={styles.restaurant} numberOfLines={1}>
                    {order.restaurant_name}
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
    </Screen>
  );
}

function restaurantInitials(name: string) {
  return (
    name
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
  return `${new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt))} · ${statusLabel(status, tr)}`;
}

function statusLabel(status: Order["order_status"], tr: (ro: string, en: string) => string) {
  if (status === "delivered") return tr("Livrată", "Delivered");
  if (status === "on_the_way") return tr("În livrare", "On the way");
  if (status === "preparing") return tr("În preparare", "Preparing");
  if (status === "cancelled") return tr("Anulată", "Cancelled");
  return tr("Plasată", "Placed");
}

const MOCK_ORDERS: OrderWithImage[] = [
  {
    id: 9012,
    restaurant: 1,
    restaurant_name: "Restaurant Bavaria",
    subtotal: 33.69,
    delivery_fee: 5,
    discount: 0,
    total: 38.69,
    payment_method: "card",
    order_status: "delivered",
    created_at: "2026-05-10T12:04:00Z",
    mockImage:
      "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=200&q=80",
    items: [
      { id: 1, product: 1, product_name: "Pulled Pork Platter", quantity: 1, unit_price: 27.5, total_price: 27.5 },
      { id: 2, product: 2, product_name: "Cartofi wedges", quantity: 1, unit_price: 6.19, total_price: 6.19 },
    ],
    address: 1,
  },
  {
    id: 9011,
    restaurant: 2,
    restaurant_name: "Shaormeria Cin Cin",
    subtotal: 56.2,
    delivery_fee: 5,
    discount: 0,
    total: 61.2,
    payment_method: "cash",
    order_status: "delivered",
    created_at: "2026-05-02T19:14:00Z",
    mockImage:
      "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?auto=format&fit=crop&w=200&q=80",
    items: [
      { id: 3, product: 3, product_name: "Shaorma vita mare", quantity: 1, unit_price: 34.9, total_price: 34.9 },
      { id: 4, product: 4, product_name: "Meniu crispy", quantity: 1, unit_price: 21.3, total_price: 21.3 },
    ],
    address: 1,
  },
  {
    id: 9008,
    restaurant: 3,
    restaurant_name: "McDonald's Makariou",
    subtotal: 45.12,
    delivery_fee: 6,
    discount: 4,
    total: 47.12,
    payment_method: "card",
    order_status: "delivered",
    created_at: "2026-04-18T20:45:00Z",
    mockImage:
      "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=200&q=80",
    items: [
      { id: 5, product: 5, product_name: "Big Mac Menu", quantity: 1, unit_price: 31.12, total_price: 31.12 },
      { id: 6, product: 6, product_name: "Cheeseburger", quantity: 2, unit_price: 7, total_price: 14 },
    ],
    address: 1,
  },
  {
    id: 9003,
    restaurant: 4,
    restaurant_name: "Ciorbarie Iasi",
    subtotal: 42.34,
    delivery_fee: 4,
    discount: 0,
    total: 46.34,
    payment_method: "card",
    order_status: "delivered",
    created_at: "2026-03-27T13:03:00Z",
    mockImage:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=200&q=80",
    items: [
      { id: 7, product: 7, product_name: "Ciorba radauteana", quantity: 2, unit_price: 14.5, total_price: 29 },
      { id: 8, product: 8, product_name: "Ardei iute + paine", quantity: 2, unit_price: 2.5, total_price: 5 },
      { id: 9, product: 9, product_name: "Papanași", quantity: 1, unit_price: 8.34, total_price: 8.34 },
    ],
    address: 1,
  },
];

const styles = StyleSheet.create({
  content: {
    paddingTop: 22,
    paddingBottom: 120,
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
  loadingBox: {
    minHeight: 140,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mutedText: {
    color: colors.muted,
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
  trailingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
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
