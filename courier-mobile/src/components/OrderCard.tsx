import { MapPin, Phone, Store } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatDistanceKm, formatMinutes, formatMoney, formatRelativeDate } from "../lib/format";
import { colors } from "../theme/colors";
import { CourierOrder } from "../types/models";
import { PrimaryButton } from "./PrimaryButton";
import { StatusPill } from "./StatusPill";

type Props = {
  order: CourierOrder;
  actionLabel?: string;
  onAction?: () => void;
  onPress?: () => void;
  disabled?: boolean;
};

export function OrderCard({ order, actionLabel, onAction, onPress, disabled }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.orderCode}>Order #{order.id}</Text>
          <Text style={styles.orderDate}>{formatRelativeDate(order.created_at)}</Text>
        </View>
        <StatusPill status={order.delivery_status || order.order_status} />
      </View>

      <Text style={styles.restaurant}>{order.restaurant_name}</Text>

      <View style={styles.row}>
        <Store color={colors.lime} size={16} />
        <Text style={styles.rowText}>{order.restaurant_name}</Text>
      </View>

      <View style={styles.row}>
        <MapPin color={colors.lime} size={16} />
        <Text style={styles.rowText}>{order.address_summary || "Pickup at restaurant"}</Text>
      </View>

      <View style={styles.row}>
        <Phone color={colors.lime} size={16} />
        <Text style={styles.rowText}>
          {order.customer_name} · {order.customer_phone}
        </Text>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Customer total</Text>
          <Text style={styles.metricValue}>{formatMoney(order.total)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Distance</Text>
          <Text style={styles.metricValue}>{formatDistanceKm(order.estimated_distance_km)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>ETA</Text>
          <Text style={styles.metricValue}>{formatMinutes(order.estimated_arrival_minutes)}</Text>
        </View>
      </View>

      {actionLabel && onAction ? (
        <PrimaryButton title={actionLabel} onPress={onAction} disabled={disabled} style={styles.button} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.18)",
    gap: 14,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  orderCode: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  orderDate: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  restaurant: {
    color: colors.black,
    fontSize: 24,
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  metrics: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.cardSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    padding: 14,
    gap: 6,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metricValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  button: {
    marginTop: 4,
  },
});
