import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, RotateCcw } from "lucide-react-native";

import { ordersApi } from "../api/ordersApi";
import { Screen } from "../components/Screen";
import { mockRestaurants } from "../data/mockData";
import { money } from "../lib/format";
import { FALLBACK_RESTAURANT_IMAGE, resolveImageUri } from "../lib/images";
import { OrdersStackParamList } from "../navigation/types";
import { useOrdersStore } from "../store/ordersStore";
import { colors } from "../theme/colors";
import { Order } from "../types/models";

type Props = NativeStackScreenProps<OrdersStackParamList, "OrdersHome">;

export function OrdersScreen({ navigation }: Props) {
  const orders = useOrdersStore((state) => state.orders);
  const setOrders = useOrdersStore((state) => state.setOrders);
  const displayOrders = useMemo(() => buildDisplayOrders(orders), [orders]);

  useEffect(() => {
    ordersApi.list().then(setOrders).catch(() => undefined);
  }, [setOrders]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Comenzile mele</Text>
        <View style={styles.list}>
          {displayOrders.map((order) => (
            <Pressable key={`${order.id}-${order.created_at}`} style={styles.order} onPress={() => navigation.navigate("OrderDetails", { order })}>
                <View style={styles.row}>
                <View style={styles.thumbCol}>
                  <View style={styles.thumb}>
                    <Image
                      source={{
                        uri: resolveImageUri(
                          mockRestaurants.find((restaurant) => restaurant.id === order.restaurant)?.cover_image,
                          FALLBACK_RESTAURANT_IMAGE
                        ),
                      }}
                      style={styles.thumbImage}
                    />
                  </View>
                  <Text style={styles.thumbDate}>{formatOrderDate(order.created_at)}</Text>
                </View>
                <View style={styles.main}>
                  <Text style={styles.restaurant} numberOfLines={1}>
                    {order.restaurant_name}
                  </Text>
                  <Text style={styles.total}>{money(order.total)}</Text>
                  <Text style={styles.meta}>{statusLabel(order.order_status)}</Text>
                </View>
                <View style={styles.reorderButton}>
                  <RotateCcw size={20} color={colors.text} strokeWidth={1.9} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 6,
    paddingBottom: 120,
  },
  backButton: {
    width: 30,
    height: 30,
    alignItems: "flex-start",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginBottom: 56,
  },
  list: {
    gap: 0,
  },
  order: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  thumbCol: {
    width: 84,
    gap: 6,
  },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: colors.cardSoft,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  thumbDate: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
  },
  main: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  restaurant: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  meta: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  total: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  reorderButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
  },
});

function statusLabel(status: string) {
  if (status === "preparing") return "În curs de preparare";
  if (status === "delivered") return "Livrată";

  return status
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildDisplayOrders(orders: Order[]) {
  if (orders.length === 0) return [];

  const uniqueRestaurantIds = Array.from(
    new Set(
      orders
        .map((order) => order.restaurant)
        .filter((restaurantId): restaurantId is number => typeof restaurantId === "number")
    )
  );

  const fallbackRestaurantIds = mockRestaurants.map((restaurant) => restaurant.id);
  const restaurantIdsPool = Array.from(new Set([...uniqueRestaurantIds, ...fallbackRestaurantIds]));
  const baseOrder = orders[0];

  return restaurantIdsPool.slice(0, 14).map((restaurantId, index) => {
    const restaurant = mockRestaurants.find((item) => item.id === restaurantId);
    const createdAt = new Date(baseOrder.created_at);
    createdAt.setDate(createdAt.getDate() - index * 6);
    createdAt.setHours(12 + (index % 8), 5 + ((index * 7) % 50), 0, 0);

    const orderStatus: Order["order_status"] = index % 3 === 0 ? "preparing" : "delivered";

    return {
      ...baseOrder,
      id: 90000 + index,
      restaurant: restaurantId,
      restaurant_name: restaurant?.name ?? `Restaurant ${restaurantId}`,
      total: Number(32 + index * 3.7).toFixed(2),
      created_at: createdAt.toISOString(),
      order_status: orderStatus,
    };
  });
}
