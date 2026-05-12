import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, ChevronRight, ListOrdered } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { ordersApi } from "../api/ordersApi";
import { StatusPill } from "../components/StatusPill";
import { Screen } from "../components/Screen";
import { money, shortDate } from "../lib/format";
import { OrdersStackParamList } from "../navigation/types";
import { useOrdersStore } from "../store/ordersStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<OrdersStackParamList, "OrdersHome">;

export function OrdersScreen({ navigation }: Props) {
  const orders = useOrdersStore((state) => state.orders);
  const setOrders = useOrdersStore((state) => state.setOrders);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setOrders(data);
      } catch {
        setError("Nu am putut încărca comenzile din backend.");
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
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={() => loadOrders("refresh")} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Comenzile mele</Text>
            <Text style={styles.subtitle}>Istoric real sincronizat cu backend-ul</Text>
          </View>
        </View>

        {error && <Text style={styles.errorBanner}>{error}</Text>}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.red} />
            <Text style={styles.mutedText}>Se încarcă comenzile...</Text>
          </View>
        ) : orders.length ? (
          <View style={styles.list}>
            {orders.map((order) => (
              <Pressable key={order.id} style={({ pressed }) => [styles.order, pressed && styles.pressed]} onPress={() => navigation.navigate("OrderDetails", { order })}>
                <View style={styles.orderIcon}>
                  <Text style={styles.orderIconText}>{restaurantInitials(order.restaurant_name)}</Text>
                </View>
                <View style={styles.main}>
                  <Text style={styles.restaurant} numberOfLines={1}>
                    {order.restaurant_name}
                  </Text>
                  <Text style={styles.meta}>{shortDate(order.created_at)}</Text>
                  <View style={styles.statusWrap}>
                    <StatusPill status={order.order_status} />
                  </View>
                </View>
                <View style={styles.trailing}>
                  <Text style={styles.total}>{money(order.total)}</Text>
                  <ChevronRight size={19} color={colors.muted} strokeWidth={2.2} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <ListOrdered size={28} color={colors.red} strokeWidth={2.2} />
            <Text style={styles.emptyTitle}>Nu ai comenzi încă</Text>
            <Text style={styles.emptyText}>După prima comandă plasată cu backend-ul, istoricul apare aici.</Text>
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

const styles = StyleSheet.create({
  content: {
    paddingTop: 10,
    paddingBottom: 120,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 3,
    color: colors.muted,
    fontWeight: "700",
  },
  errorBanner: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFF1F1",
    color: colors.redDark,
    padding: 12,
    fontSize: 13,
    fontWeight: "700",
  },
  loadingBox: {
    minHeight: 140,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mutedText: {
    color: colors.muted,
    fontWeight: "700",
  },
  list: {
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  order: {
    minHeight: 92,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red,
  },
  orderIconText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 16,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  restaurant: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  statusWrap: {
    alignSelf: "flex-start",
    marginTop: 3,
  },
  trailing: {
    alignItems: "flex-end",
    gap: 8,
  },
  total: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  emptyBox: {
    minHeight: 190,
    borderRadius: 24,
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
