import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { CourierDeliveryStatus, OrderStatus } from "../types/models";

const labels: Record<OrderStatus | CourierDeliveryStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up",
  on_the_way: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Rejected",
  assigned: "Assigned",
  "": "Unknown",
};

export function StatusPill({ status }: { status: OrderStatus | CourierDeliveryStatus }) {
  const positive = ["accepted", "preparing", "ready_for_pickup", "assigned", "picked_up", "on_the_way", "delivered"].includes(
    status,
  );

  return (
    <View style={[styles.pill, positive ? styles.positive : styles.negative]}>
      <Text style={[styles.text, positive ? styles.positiveText : styles.negativeText]}>{labels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  positive: {
    backgroundColor: "rgba(184, 242, 109, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.14)",
  },
  negative: {
    backgroundColor: "rgba(245, 158, 11, 0.24)",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.14)",
  },
  text: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  positiveText: {
    color: colors.lime,
  },
  negativeText: {
    color: "#7A4B00",
  },
});
