import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { CourierLiveMap } from "../components/CourierLiveMap";
import { useAuthStore } from "../store/authStore";
import { useCourierStore } from "../store/courierStore";
import { colors } from "../theme/colors";

export function AvailableOrdersScreen() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const profile = useCourierStore((state) => state.profile);
  const orders = useCourierStore((state) => state.orders);
  const refreshAll = useCourierStore((state) => state.refreshAll);

  const myOrders = useMemo(() => orders.filter((order) => order.courier === currentUserId), [currentUserId, orders]);
  const activeOrder = useMemo(
    () => myOrders.find((order) => !["delivered", "cancelled", "rejected"].includes(order.order_status)) ?? null,
    [myOrders],
  );

  useFocusEffect(
    useCallback(() => {
      void refreshAll().catch(() => undefined);
    }, [refreshAll]),
  );

  return (
    <View style={styles.screen}>
      <CourierLiveMap
        currentLatitude={profile?.current_latitude}
        currentLongitude={profile?.current_longitude}
        targetLatitude={activeOrder?.address_details?.latitude}
        targetLongitude={activeOrder?.address_details?.longitude}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
