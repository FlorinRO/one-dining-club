import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { OrderStatus } from "../types/models";

const labels: Record<OrderStatus, string> = {
  pending: "Plasată",
  accepted: "Acceptată",
  preparing: "În preparare",
  ready_for_pickup: "Gata",
  picked_up: "Ridicată",
  on_the_way: "În livrare",
  delivered: "Livrată",
  cancelled: "Anulată",
  rejected: "Respinsă",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  const positive = ["accepted", "preparing", "ready_for_pickup", "picked_up", "on_the_way", "delivered"].includes(status);
  return (
    <View style={[styles.pill, positive ? styles.positive : styles.negative]}>
      <Text style={[styles.text, positive ? styles.positiveText : styles.negativeText]}>{labels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  positive: {
    backgroundColor: "rgba(184, 242, 109, 0.14)",
  },
  negative: {
    backgroundColor: "rgba(231, 51, 63, 0.16)",
  },
  text: {
    fontWeight: "900",
    fontSize: 12,
  },
  positiveText: {
    color: colors.lime,
  },
  negativeText: {
    color: colors.red,
  },
});
