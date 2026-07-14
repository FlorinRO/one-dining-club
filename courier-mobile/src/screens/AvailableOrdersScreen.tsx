import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CourierLiveMap } from "../components/CourierLiveMap";
import { useAuthStore } from "../store/authStore";
import { useCourierStore } from "../store/courierStore";
import { colors } from "../theme/colors";

export function AvailableOrdersScreen() {
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const profile = useCourierStore((state) => state.profile);
  const orders = useCourierStore((state) => state.orders);
  const refreshAll = useCourierStore((state) => state.refreshAll);
  const refreshOrders = useCourierStore((state) => state.refreshOrders);
  const acceptOrder = useCourierStore((state) => state.acceptOrder);
  const declineOrder = useCourierStore((state) => state.declineOrder);
  const [now, setNow] = useState(Date.now());
  const [responding, setResponding] = useState(false);

  const myOrders = useMemo(() => orders.filter((order) => order.courier === currentUserId), [currentUserId, orders]);
  const dispatchOffer = useMemo(
    () => orders.find((order) => !order.courier && Boolean(order.dispatch_offer_expires_at)) ?? null,
    [orders],
  );
  const activeOrder = useMemo(
    () => myOrders.find((order) => !["delivered", "cancelled", "rejected"].includes(order.order_status)) ?? null,
    [myOrders],
  );

  useFocusEffect(
    useCallback(() => {
      void refreshAll().catch(() => undefined);
      const pollingInterval = setInterval(() => {
        void refreshOrders().catch(() => undefined);
      }, 5000);
      return () => clearInterval(pollingInterval);
    }, [refreshAll, refreshOrders]),
  );

  useEffect(() => {
    const countdownInterval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(countdownInterval);
  }, []);

  const remainingSeconds = dispatchOffer?.dispatch_offer_expires_at
    ? Math.max(0, Math.ceil((new Date(dispatchOffer.dispatch_offer_expires_at).getTime() - now) / 1000))
    : 0;
  const mapOrder = activeOrder ?? dispatchOffer;
  const mapTargetIsRestaurant = Boolean(dispatchOffer || activeOrder?.order_status === "ready_for_pickup");

  const respondToOffer = async (action: "accept" | "decline") => {
    if (!dispatchOffer || responding) {
      return;
    }
    setResponding(true);
    try {
      if (action === "accept") {
        await acceptOrder(dispatchOffer.id);
      } else {
        await declineOrder(dispatchOffer.id);
      }
    } finally {
      setResponding(false);
    }
  };

  return (
    <View style={styles.screen}>
      <CourierLiveMap
        currentLatitude={profile?.current_latitude}
        currentLongitude={profile?.current_longitude}
        targetLatitude={mapTargetIsRestaurant ? mapOrder?.restaurant_latitude : mapOrder?.address_details?.latitude}
        targetLongitude={mapTargetIsRestaurant ? mapOrder?.restaurant_longitude : mapOrder?.address_details?.longitude}
      />
      {dispatchOffer ? (
        <View style={[styles.offerCard, { bottom: Math.max(insets.bottom, 16) + 74 }]}>
          <View style={styles.offerHeader}>
            <View style={styles.offerCopy}>
              <Text style={styles.offerEyebrow}>COMANDĂ NOUĂ</Text>
              <Text style={styles.offerRestaurant}>{dispatchOffer.restaurant_name}</Text>
            </View>
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownText}>{remainingSeconds}</Text>
            </View>
          </View>
          <Text style={styles.offerAddress}>{dispatchOffer.restaurant_address}</Text>
          <Text style={styles.offerMeta}>
            {Number(dispatchOffer.dispatch_distance_km ?? 0).toFixed(1)} km până la restaurant · {dispatchOffer.delivery_fee} lei
          </Text>
          <View style={styles.offerActions}>
            <Pressable
              disabled={responding || remainingSeconds === 0}
              onPress={() => void respondToOffer("decline")}
              style={({ pressed }) => [styles.declineButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.declineLabel}>Refuză</Text>
            </Pressable>
            <Pressable
              disabled={responding || remainingSeconds === 0}
              onPress={() => void respondToOffer("accept")}
              style={({ pressed }) => [styles.acceptButton, pressed && styles.buttonPressed]}
            >
              {responding ? <ActivityIndicator color={colors.black} /> : <Text style={styles.acceptLabel}>Acceptă</Text>}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  offerCard: {
    position: "absolute",
    left: 16,
    right: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    gap: 8,
  },
  offerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  offerCopy: { flex: 1, gap: 3 },
  offerEyebrow: { color: colors.greenDark, fontSize: 12, fontWeight: "900", letterSpacing: 0.8 },
  offerRestaurant: { color: colors.text, fontSize: 22, fontWeight: "900" },
  countdownBadge: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.black },
  countdownText: { color: colors.white, fontSize: 18, fontWeight: "900" },
  offerAddress: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  offerMeta: { color: colors.text, fontSize: 15, fontWeight: "800" },
  offerActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  declineButton: { flex: 1, minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.black },
  declineLabel: { color: colors.black, fontSize: 16, fontWeight: "900" },
  acceptButton: { flex: 1.5, minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime },
  acceptLabel: { color: colors.black, fontSize: 16, fontWeight: "900" },
  buttonPressed: { opacity: 0.72 },
});
