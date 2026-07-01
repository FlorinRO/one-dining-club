import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { LocateFixed, RefreshCcw } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "../components/EmptyState";
import { OrderCard } from "../components/OrderCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { SectionHeader } from "../components/SectionHeader";
import { useCourierStore } from "../store/courierStore";
import { colors } from "../theme/colors";
import { RootStackParamList } from "../navigation/types";

export function AvailableOrdersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const orders = useCourierStore((state) => state.orders);
  const profile = useCourierStore((state) => state.profile);
  const ordersLoading = useCourierStore((state) => state.ordersLoading);
  const error = useCourierStore((state) => state.error);
  const refreshAll = useCourierStore((state) => state.refreshAll);
  const acceptOrder = useCourierStore((state) => state.acceptOrder);
  const syncCurrentLocation = useCourierStore((state) => state.syncCurrentLocation);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const activeOrder = useMemo(
    () => orders.find((order) => order.courier && !["delivered", "cancelled", "rejected"].includes(order.order_status)),
    [orders],
  );
  const availableOrders = useMemo(
    () => orders.filter((order) => !order.courier && order.order_status === "ready_for_pickup"),
    [orders],
  );

  useFocusEffect(
    useCallback(() => {
      void refreshAll().catch(() => undefined);
    }, [refreshAll]),
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncLocation = async () => {
    try {
      const result = await syncCurrentLocation();
      setLocationMessage(result.message);
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : "Could not update location.");
    }
  };

  const handleAccept = async (orderId: number) => {
    setBusyOrderId(orderId);
    try {
      await acceptOrder(orderId);
      navigation.navigate("OrderDetails", { orderId });
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl tintColor={colors.lime} refreshing={refreshing} onRefresh={refresh} />}
    >
      <LinearGradient colors={["rgba(184,242,109,0.18)", "rgba(14,18,10,0.92)"]} style={styles.hero}>
        <SectionHeader
          eyebrow="Live Board"
          title="Claim, pick up, deliver."
          subtitle="Your next run is one tap away. Keep availability on and refresh your live position before you head out."
        />
        <View style={styles.heroActions}>
          <PrimaryButton title={profile?.is_available ? "Available now" : "Currently offline"} onPress={() => undefined} disabled />
          <PrimaryButton title="Update location" onPress={handleSyncLocation} variant="ghost" icon={<LocateFixed color={colors.white} size={18} />} />
        </View>
        {locationMessage ? <Text style={styles.inlineNote}>{locationMessage}</Text> : null}
      </LinearGradient>

      {activeOrder ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Active" title={`Order #${activeOrder.id} is in motion`} subtitle="Open the active delivery to advance status and review customer instructions." />
          <OrderCard order={activeOrder} onPress={() => navigation.navigate("OrderDetails", { orderId: activeOrder.id })} />
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          eyebrow="Available"
          title={`${availableOrders.length} orders ready for pickup`}
          subtitle="Fresh requests assigned by the restaurant appear here. Accept one when you are ready."
        />

        {ordersLoading && !orders.length ? (
          <View style={styles.loaderCard}>
            <ActivityIndicator color={colors.lime} />
            <Text style={styles.loaderText}>Fetching live orders...</Text>
          </View>
        ) : null}

        {!ordersLoading && !availableOrders.length ? (
          <EmptyState
            title="No open pickup requests."
            description={error ?? "Pull to refresh, update your location, or stay available and new delivery runs will land here."}
            action={<PrimaryButton title="Refresh board" onPress={refresh} variant="ghost" icon={<RefreshCcw color={colors.white} size={18} />} />}
          />
        ) : null}

        {availableOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            actionLabel="Accept delivery"
            disabled={busyOrderId === order.id}
            onAction={() => handleAccept(order.id)}
            onPress={() => navigation.navigate("OrderDetails", { orderId: order.id })}
          />
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
    gap: 18,
    paddingBottom: 120,
  },
  hero: {
    padding: 20,
    borderRadius: 28,
    gap: 18,
  },
  heroActions: {
    gap: 12,
  },
  inlineNote: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 14,
  },
  loaderCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 12,
  },
  loaderText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 14,
  },
});
