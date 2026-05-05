import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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

  useEffect(() => {
    ordersApi.list().then(setOrders).catch(() => undefined);
  }, [setOrders]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Orders</Text>
        <View style={styles.list}>
          {orders.map((order) => (
            <Pressable key={order.id} style={styles.order} onPress={() => navigation.navigate("OrderDetails", { order })}>
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.restaurant}>{order.restaurant_name}</Text>
                  <Text style={styles.date}>{shortDate(order.created_at)}</Text>
                </View>
                <Text style={styles.total}>{money(order.total)}</Text>
              </View>
              <StatusPill status={order.order_status} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 14,
    paddingBottom: 112,
    gap: 18,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
  },
  list: {
    gap: 12,
  },
  order: {
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  restaurant: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  date: {
    marginTop: 4,
    color: colors.muted,
    fontWeight: "700",
  },
  total: {
    color: colors.lime,
    fontSize: 18,
    fontWeight: "900",
  },
});

