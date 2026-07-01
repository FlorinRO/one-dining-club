import { useCallback, useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { EmptyState } from "../components/EmptyState";
import { OrderCard } from "../components/OrderCard";
import { SectionHeader } from "../components/SectionHeader";
import { useAuthStore } from "../store/authStore";
import { useCourierStore } from "../store/courierStore";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

export function DeliveriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const orders = useCourierStore((state) => state.orders);
  const refreshOrders = useCourierStore((state) => state.refreshOrders);
  const ordersLoading = useCourierStore((state) => state.ordersLoading);

  useFocusEffect(
    useCallback(() => {
      void refreshOrders().catch(() => undefined);
    }, [refreshOrders]),
  );

  const myOrders = useMemo(() => orders.filter((order) => order.courier === currentUserId), [currentUserId, orders]);
  const activeOrders = myOrders.filter((order) => !["delivered", "cancelled", "rejected"].includes(order.order_status));
  const completedOrders = myOrders.filter((order) => ["delivered", "cancelled", "rejected"].includes(order.order_status));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl tintColor="#B8F26D" refreshing={ordersLoading} onRefresh={refreshOrders} />}
    >
      <View style={styles.section}>
        <SectionHeader eyebrow="My Runs" title="Active deliveries" subtitle="Everything currently assigned to you, in one fast operational queue." />
        {!activeOrders.length ? (
          <EmptyState
            title="No active deliveries right now."
            description="Accept a new pickup request from the Live Board and it will appear here instantly."
          />
        ) : null}
        {activeOrders.map((order) => (
          <OrderCard key={order.id} order={order} onPress={() => navigation.navigate("OrderDetails", { orderId: order.id })} />
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="History" title="Completed deliveries" subtitle="Recent completed runs stay visible here for quick reference." />
        {!completedOrders.length ? (
          <EmptyState title="Nothing delivered yet." description="Delivered orders will move here automatically after you complete the flow." />
        ) : null}
        {completedOrders.map((order) => (
          <OrderCard key={order.id} order={order} onPress={() => navigation.navigate("OrderDetails", { orderId: order.id })} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#090909",
  },
  content: {
    padding: 18,
    gap: 24,
    paddingBottom: 120,
  },
  section: {
    gap: 14,
  },
});
