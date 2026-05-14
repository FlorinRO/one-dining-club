import { StyleSheet, Text, View } from "react-native";

import { useI18n } from "../i18n/useI18n";
import { colors } from "../theme/colors";
import { OrderStatus } from "../types/models";

const labelKeys: Record<OrderStatus, string> = {
  pending: "status.pending",
  accepted: "status.accepted",
  preparing: "status.preparing",
  ready_for_pickup: "status.ready",
  picked_up: "status.picked_up",
  on_the_way: "status.on_the_way",
  delivered: "status.delivered",
  cancelled: "status.cancelled",
  rejected: "status.rejected",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  const positive = ["accepted", "preparing", "ready_for_pickup", "picked_up", "on_the_way", "delivered"].includes(status);
  return (
    <View style={[styles.pill, positive ? styles.positive : styles.negative]}>
      <Text style={[styles.text, positive ? styles.positiveText : styles.negativeText]}>{t(labelKeys[status])}</Text>
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
