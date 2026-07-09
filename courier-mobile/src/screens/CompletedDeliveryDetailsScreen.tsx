import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  CreditCard,
  MapPin,
  PackageCheck,
  ReceiptText,
  Route,
  ShoppingBag,
  Store,
  UserRound,
  Wallet,
} from "lucide-react-native";
import { ReactNode, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDistanceKm, formatMinutes, formatMoney } from "../lib/format";
import { RootStackParamList } from "../navigation/types";
import { useCourierStore } from "../store/courierStore";
import { colors } from "../theme/colors";
import { CourierCompletedDelivery } from "../types/models";

type Props = NativeStackScreenProps<RootStackParamList, "CompletedDeliveryDetails">;

export function CompletedDeliveryDetailsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const deliveryId = route.params.deliveryId;
  const operationsSummary = useCourierStore((state) => state.operationsSummary);

  const delivery = useMemo(
    () => operationsSummary?.recent_deliveries.find((candidate) => candidate.id === deliveryId) ?? null,
    [deliveryId, operationsSummary?.recent_deliveries],
  );
  const order = delivery?.order ?? null;
  const subtotal = order?.subtotal ?? 0;
  const discount = order?.discount ?? 0;

  if (!delivery) {
    return (
      <View style={[styles.missingScreen, { paddingTop: Math.max(insets.top, 20) }]}>
        <Text style={styles.missingTitle}>Cursa nu este disponibilă</Text>
        <Text style={styles.missingBody}>Revino în istoric și reîmprospătează lista de curse.</Text>
        <Pressable style={styles.primaryBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBackLabel}>Înapoi</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 8, 18),
          paddingBottom: Math.max(insets.bottom + 48, 64),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()} style={styles.headerButtonGhost}>
          <ArrowLeft color={colors.text} size={26} strokeWidth={2.25} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Detalii cursă</Text>
          <Text style={styles.headerSubtitle}>{formatDeliveryCode(delivery)}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.statusPill}>
            <PackageCheck color={stylesConfig.accent} size={16} strokeWidth={2.4} />
            <Text style={styles.statusText}>{getStatusLabel(delivery)}</Text>
          </View>
          <Text style={styles.completedAt}>{formatCompletedDate(delivery.completed_at)}</Text>
        </View>

        <Text style={styles.heroTitle}>{formatMoney(delivery.delivery_fee)}</Text>
        <Text style={styles.heroBody}>Câștig pentru livrarea finalizată de la {delivery.restaurant_name}.</Text>

        <View style={styles.metricGrid}>
          <MetricItem icon={<Route color={stylesConfig.metricIcon} size={17} />} label="Distanță" value={formatDistanceKm(delivery.distance_km)} />
          <MetricItem icon={<Clock3 color={stylesConfig.metricIcon} size={17} />} label="Timp" value={formatMinutes(delivery.duration_minutes)} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Traseu</Text>
        <RoutePoint icon={<Store color={stylesConfig.pickup} size={17} />} label="Pickup" value={delivery.restaurant_name} />
        <View style={styles.routeDivider} />
        <RoutePoint icon={<MapPin color={stylesConfig.dropoff} size={17} />} label="Drop-off" value={delivery.dropoff_address || "Adresă indisponibilă"} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Client și plată</Text>
        <DetailRow icon={<UserRound color={stylesConfig.icon} size={17} />} label="Client" value={delivery.customer_name} />
        <DetailRow icon={<CreditCard color={stylesConfig.icon} size={17} />} label="Metodă plată" value={delivery.payment_method_label} />
        <DetailRow icon={<Wallet color={stylesConfig.icon} size={17} />} label="Total client" value={formatMoney(delivery.total)} />
        <DetailRow icon={<CalendarClock color={stylesConfig.icon} size={17} />} label="Finalizată" value={formatCompletedDate(delivery.completed_at)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Produse livrate</Text>
        {delivery.items.length ? (
          delivery.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemIconWrap}>
                <ShoppingBag color={stylesConfig.accent} size={16} strokeWidth={2.2} />
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.quantity}x {item.product_name}
                </Text>
                {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
              </View>
              <Text style={styles.itemPrice}>{formatMoney(item.total_price)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyDetailText}>{formatSimulationItemsSummary(delivery)}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Observații</Text>
        <NoteRow label="Client" value={order?.customer_note || "Fără instrucțiuni de la client."} />
        <NoteRow label="Restaurant" value={order?.restaurant_note || getMetadataString(delivery, "order_code") || delivery.reference_id || "Fără instrucțiuni de la restaurant."} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bon cursă</Text>
        <SummaryRow label="Subtotal produse" value={formatMoney(subtotal)} />
        <SummaryRow label="Taxă livrare" value={formatMoney(delivery.delivery_fee)} highlight />
        <SummaryRow label="Discount" value={formatMoney(discount)} />
        <SummaryRow label="Total client" value={formatMoney(delivery.total)} strong />
      </View>
    </ScrollView>
  );
}

function MetricItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metricItem}>
      {icon}
      <View style={styles.metricText}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
    </View>
  );
}

function RoutePoint({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.routePoint}>
      <View style={styles.routeIconWrap}>{icon}</View>
      <View style={styles.routeText}>
        <Text style={styles.routeLabel}>{label}</Text>
        <Text style={styles.routeValue}>{value}</Text>
      </View>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>{icon}</View>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function NoteRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.noteRow}>
      <Text style={styles.noteLabel}>{label}</Text>
      <Text style={styles.noteValue}>{value}</Text>
    </View>
  );
}

function SummaryRow({ label, value, highlight = false, strong = false }: { label: string; value: string; highlight?: boolean; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryLabelWrap}>
        <ReceiptText color={stylesConfig.icon} size={15} />
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight, strong && styles.summaryValueStrong]}>{value}</Text>
    </View>
  );
}

function formatDeliveryCode(delivery: CourierCompletedDelivery) {
  if (delivery.order_id) {
    return `#${delivery.order_id}`;
  }

  return delivery.reference_id ? `#${delivery.reference_id}` : `#${delivery.operation_entry_id}`;
}

function formatSimulationItemsSummary(delivery: CourierCompletedDelivery) {
  const itemsSummary = getMetadataString(delivery, "items_summary");
  return itemsSummary ? `Produse simulate: ${itemsSummary}` : "Cursa a fost înregistrată ca simulare în backend, fără produse asociate.";
}

function getMetadataString(delivery: CourierCompletedDelivery, key: string) {
  const value = delivery.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : "";
}

function getStatusLabel(delivery: CourierCompletedDelivery) {
  if (delivery.status_label) {
    return delivery.status_label;
  }

  switch (delivery.status) {
    case "delivered":
      return "Livrată";
    case "cancelled":
      return "Anulată";
    case "rejected":
      return "Respinsă";
    default:
      return delivery.status;
  }
}

function formatCompletedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const stylesConfig = {
  border: "rgba(17,17,17,0.08)",
  accent: "#27B457",
  icon: "#8F97A8",
  metricIcon: "#536174",
  pickup: "#2FC56C",
  dropoff: "#FF5A36",
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: 14,
    gap: 14,
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButtonGhost: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    alignItems: "center",
    gap: 2,
  },
  headerTitle: {
    color: "#121826",
    fontSize: 18,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: stylesConfig.border,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ECF8EF",
  },
  statusText: {
    color: stylesConfig.accent,
    fontSize: 11,
    fontWeight: "800",
  },
  completedAt: {
    flex: 1,
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
  },
  heroTitle: {
    color: stylesConfig.accent,
    fontSize: 26,
    fontWeight: "700",
  },
  heroBody: {
    color: "#3B4354",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  metricGrid: {
    flexDirection: "row",
    gap: 10,
  },
  metricItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#F7F9FA",
  },
  metricText: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "600",
  },
  metricValue: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: stylesConfig.border,
    gap: 12,
  },
  cardTitle: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "800",
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  routeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9FA",
  },
  routeText: {
    flex: 1,
    gap: 3,
  },
  routeLabel: {
    color: "#7A8292",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  routeValue: {
    color: "#222B3D",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  routeDivider: {
    width: 1,
    height: 18,
    marginLeft: 15,
    backgroundColor: "rgba(17,17,17,0.12)",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9FA",
  },
  detailText: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    color: "#7A8292",
    fontSize: 10,
    fontWeight: "700",
  },
  detailValue: {
    color: "#222B3D",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECF8EF",
  },
  itemContent: {
    flex: 1,
    gap: 3,
  },
  itemName: {
    color: "#222B3D",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  itemNotes: {
    color: "#7A8292",
    fontSize: 11,
    lineHeight: 15,
  },
  itemPrice: {
    color: "#222B3D",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyDetailText: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  noteRow: {
    gap: 4,
  },
  noteLabel: {
    color: "#7A8292",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  noteValue: {
    color: "#30394C",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabelWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },
  summaryValue: {
    color: "#222B3D",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  summaryValueHighlight: {
    color: stylesConfig.accent,
    fontWeight: "900",
  },
  summaryValueStrong: {
    color: "#111827",
    fontWeight: "900",
  },
  missingScreen: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    gap: 12,
  },
  missingTitle: {
    color: "#121826",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  missingBody: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  primaryBackButton: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: stylesConfig.accent,
  },
  primaryBackLabel: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
});
