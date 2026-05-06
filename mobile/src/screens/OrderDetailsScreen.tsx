import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { StatusPill } from "../components/StatusPill";
import { Screen } from "../components/Screen";
import { money, shortDate } from "../lib/format";
import { OrdersStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { OrderStatus } from "../types/models";

type Props = NativeStackScreenProps<OrdersStackParamList, "OrderDetails">;

const timeline: Array<{ status: OrderStatus; label: string }> = [
  { status: "pending", label: "Comandă plasată" },
  { status: "accepted", label: "Acceptată" },
  { status: "preparing", label: "În preparare" },
  { status: "ready_for_pickup", label: "Gata de ridicare" },
  { status: "on_the_way", label: "În livrare" },
  { status: "delivered", label: "Livrată" },
];

const progressRank: Record<OrderStatus, number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  ready_for_pickup: 3,
  picked_up: 4,
  on_the_way: 4,
  delivered: 5,
  cancelled: -1,
  rejected: -1,
};

export function OrderDetailsScreen({ route }: Props) {
  const { order } = route.params;
  const currentRank = progressRank[order.order_status];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.title}>Comandă #{order.id}</Text>
          <Text style={styles.subtitle}>{order.restaurant_name} · {shortDate(order.created_at)}</Text>
        </View>
        <StatusPill status={order.order_status} />
        <View style={styles.timeline}>
          {timeline.map((item, index) => {
            const active = currentRank >= progressRank[item.status];
            return (
              <View key={item.status} style={styles.timelineItem}>
                <View style={[styles.dot, active && styles.dotActive]} />
                {index !== timeline.length - 1 && <View style={[styles.line, active && styles.lineActive]} />}
                <Text style={[styles.timelineText, active && styles.timelineTextActive]}>{item.label}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Produse</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.quantity} x {item.product_name}</Text>
              <Text style={styles.itemPrice}>{money(item.total_price)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Total</Text>
          <SummaryRow label="Subtotal" value={money(order.subtotal)} />
          <SummaryRow label="Livrare" value={money(order.delivery_fee)} />
          <SummaryRow label="Reducere" value={`-${money(order.discount)}`} positive />
          <View style={styles.divider} />
          <SummaryRow label="Total" value={money(order.total)} total />
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Adresă</Text>
          <Text style={styles.addressText}>
            {typeof order.address === "object" ? order.address.address_line_1 : "Adresă salvată"}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function SummaryRow({ label, value, total, positive }: { label: string; value: string; total?: boolean; positive?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, total && styles.totalLabel]}>{label}</Text>
      <Text style={[styles.summaryValue, positive && styles.positive, total && styles.totalValue]}>{value}</Text>
    </View>
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
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 6,
    color: colors.muted,
    fontWeight: "700",
  },
  timeline: {
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 4,
  },
  timelineItem: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  dot: {
    marginTop: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.cardSoft,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  line: {
    position: "absolute",
    left: 7,
    top: 20,
    bottom: -4,
    width: 2,
    backgroundColor: colors.border,
  },
  lineActive: {
    backgroundColor: colors.limeDark,
  },
  timelineText: {
    color: colors.muted,
    fontWeight: "800",
  },
  timelineTextActive: {
    color: colors.text,
  },
  panel: {
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  itemName: {
    flex: 1,
    color: colors.text,
    fontWeight: "800",
  },
  itemPrice: {
    color: colors.lime,
    fontWeight: "900",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: colors.muted,
    fontWeight: "800",
  },
  summaryValue: {
    color: colors.text,
    fontWeight: "900",
  },
  positive: {
    color: colors.lime,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  totalLabel: {
    color: colors.text,
    fontSize: 18,
  },
  totalValue: {
    color: colors.lime,
    fontSize: 20,
  },
  addressText: {
    color: colors.text,
    lineHeight: 22,
    fontWeight: "700",
  },
});
