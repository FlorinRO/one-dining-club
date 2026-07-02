import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, MapPin, Navigation, Package2, Phone, Store } from "lucide-react-native";
import { ReactNode, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CourierLiveMap } from "../components/CourierLiveMap";
import { PrimaryButton } from "../components/PrimaryButton";
import { SectionHeader } from "../components/SectionHeader";
import { StatusPill } from "../components/StatusPill";
import { formatDistanceKm, formatMinutes, formatMoney, formatRelativeDate } from "../lib/format";
import { useCourierStore } from "../store/courierStore";
import { colors } from "../theme/colors";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OrderDetails">;

function nextAction(orderStatus: string, hasCourier: boolean) {
  if (!hasCourier && orderStatus === "ready_for_pickup") {
    return { label: "Accept delivery", status: null as null | "picked_up" | "on_the_way" | "delivered", mode: "accept" as const };
  }
  if (orderStatus === "ready_for_pickup") {
    return { label: "Mark picked up", status: "picked_up" as const, mode: "advance" as const };
  }
  if (orderStatus === "picked_up") {
    return { label: "Start route", status: "on_the_way" as const, mode: "advance" as const };
  }
  if (orderStatus === "on_the_way") {
    return { label: "Mark delivered", status: "delivered" as const, mode: "advance" as const };
  }
  return null;
}

export function CourierOrderDetailsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const orderId = route.params.orderId;
  const orders = useCourierStore((state) => state.orders);
  const profile = useCourierStore((state) => state.profile);
  const acceptOrder = useCourierStore((state) => state.acceptOrder);
  const advanceOrderStatus = useCourierStore((state) => state.advanceOrderStatus);
  const [loading, setLoading] = useState(false);

  const order = useMemo(() => orders.find((candidate) => candidate.id === orderId), [orderId, orders]);
  const action = order ? nextAction(order.order_status, Boolean(order.courier)) : null;

  if (!order) {
    return (
      <View style={styles.missingScreen}>
        <Text style={styles.missingTitle}>Order unavailable</Text>
        <Text style={styles.missingBody}>This delivery no longer exists in your live queue. Go back and refresh the board.</Text>
        <PrimaryButton title="Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const handleAdvance = async () => {
    setLoading(true);
    try {
      if (!action) {
        return;
      }
      if (action.mode === "accept") {
        await acceptOrder(order.id);
      } else if (action.status) {
        await advanceOrderStatus(order.id, action.status);
      }
    } finally {
      setLoading(false);
    }
  };

  const openPhone = () => {
    void Linking.openURL(`tel:${order.customer_phone}`);
  };

  const openDirections = () => {
    const latitude = Number(order.address_details?.latitude);
    const longitude = Number(order.address_details?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
  };

  const addressLabel = order.address_summary || "Pickup at restaurant";
  const hasDropoffCoordinates =
    Number.isFinite(Number(order.address_details?.latitude)) && Number.isFinite(Number(order.address_details?.longitude));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 18) }]}>
      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <ArrowLeft color={colors.text} size={20} />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      <SectionHeader eyebrow="Delivery" title={`Order #${order.id}`} subtitle={`Created ${formatRelativeDate(order.created_at)}`} />

      <View style={styles.heroCard}>
        <StatusPill status={order.delivery_status || order.order_status} />
        <Text style={styles.heroTitle}>{order.restaurant_name}</Text>
        <Text style={styles.heroBody}>Deliver to {order.customer_name}. Keep the flow moving with clear status updates from pickup to drop-off.</Text>
        <View style={styles.heroMetaRow}>
          <HeroMeta label="Distance" value={formatDistanceKm(order.estimated_distance_km)} />
          <HeroMeta label="ETA" value={formatMinutes(order.estimated_arrival_minutes)} />
        </View>
      </View>

      <View style={styles.mapCard}>
        <CourierLiveMap
          currentLatitude={profile?.current_latitude}
          currentLongitude={profile?.current_longitude}
          targetLatitude={order.address_details?.latitude}
          targetLongitude={order.address_details?.longitude}
        />
      </View>

      <View style={styles.card}>
        <InfoRow icon={<Store color={colors.lime} size={16} />} label="Restaurant" value={order.restaurant_name} />
        <InfoRow icon={<MapPin color={colors.lime} size={16} />} label="Dropoff" value={addressLabel} />
        <InfoRow icon={<Phone color={colors.lime} size={16} />} label="Customer" value={`${order.customer_name} · ${order.customer_phone}`} actionLabel="Call" onAction={openPhone} />
        <InfoRow icon={<Package2 color={colors.lime} size={16} />} label="Payment" value={order.payment_method_label || order.payment_method} />
        {hasDropoffCoordinates ? (
          <PrimaryButton
            title="Open in Maps"
            onPress={openDirections}
            variant="ghost"
            icon={<Navigation color={colors.text} size={18} />}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delivery status flow</Text>
        <TimelineStep title="Assigned" active={Boolean(order.courier)} complete={Boolean(order.courier)} />
        <TimelineStep title="Picked up" active={order.order_status === "ready_for_pickup"} complete={["picked_up", "on_the_way", "delivered"].includes(order.order_status)} />
        <TimelineStep title="On the way" active={order.order_status === "picked_up"} complete={["on_the_way", "delivered"].includes(order.order_status)} />
        <TimelineStep title="Delivered" active={order.order_status === "on_the_way"} complete={order.order_status === "delivered"} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemMeta}>
              <Text style={styles.itemName}>
                {item.quantity}x {item.product_name}
              </Text>
              {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
            </View>
            <Text style={styles.itemPrice}>{formatMoney(item.total_price)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notes</Text>
        <Text style={styles.noteText}>{order.customer_note || "No customer instructions."}</Text>
        <Text style={styles.noteText}>{order.restaurant_note || "No restaurant instructions."}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delivery totals</Text>
        <SummaryRow label="Subtotal" value={formatMoney(order.subtotal)} />
        <SummaryRow label="Delivery fee" value={formatMoney(order.delivery_fee)} />
        <SummaryRow label="Discount" value={formatMoney(order.discount)} />
        <SummaryRow label="Customer total" value={formatMoney(order.total)} highlight />
      </View>

      {action ? <PrimaryButton title={loading ? "Updating..." : action.label} onPress={handleAdvance} disabled={loading} /> : null}
    </ScrollView>
  );
}

function HeroMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroMetaCard}>
      <Text style={styles.heroMetaLabel}>{label}</Text>
      <Text style={styles.heroMetaValue}>{value}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoContent}>
        {icon}
        <View style={styles.infoText}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
      {actionLabel && onAction ? (
        <Pressable style={styles.inlineAction} onPress={onAction}>
          <Text style={styles.inlineActionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TimelineStep({ title, active, complete }: { title: string; active: boolean; complete: boolean }) {
  return (
    <View style={styles.timelineRow}>
      <View style={[styles.timelineDot, complete && styles.timelineDotComplete, active && styles.timelineDotActive]} />
      <Text style={[styles.timelineLabel, active && styles.timelineLabelActive]}>{title}</Text>
    </View>
  );
}

function SummaryRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    gap: 18,
    paddingBottom: 48,
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.18)",
  },
  backLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  heroCard: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: "rgba(184,242,109,0.32)",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.18)",
    gap: 12,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  heroBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroMetaCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.16)",
    gap: 5,
  },
  heroMetaLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroMetaValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  mapCard: {
    height: 240,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.18)",
  },
  card: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.18)",
    padding: 18,
    gap: 14,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  infoText: {
    flex: 1,
    gap: 3,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  infoValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
  },
  inlineAction: {
    borderRadius: 999,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineActionLabel: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 12,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(17,17,17,0.18)",
  },
  timelineDotComplete: {
    backgroundColor: colors.greenDark,
  },
  timelineDotActive: {
    transform: [{ scale: 1.18 }],
    backgroundColor: colors.lime,
  },
  timelineLabel: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
  },
  timelineLabelActive: {
    color: colors.text,
  },
  itemRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  itemMeta: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  itemNotes: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  itemPrice: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "800",
  },
  noteText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  summaryValueHighlight: {
    color: colors.greenDark,
    fontSize: 17,
  },
  missingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  missingTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  missingBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
