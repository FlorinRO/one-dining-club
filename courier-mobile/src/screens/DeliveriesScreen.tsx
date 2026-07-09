import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  ShoppingBag,
} from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RootStackParamList } from "../navigation/types";
import { useCourierStore } from "../store/courierStore";
import { colors } from "../theme/colors";
import { CourierCompletedDelivery } from "../types/models";

const EMPTY_DELIVERIES: CourierCompletedDelivery[] = [];

export function DeliveriesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const ordersLoading = useCourierStore((state) => state.ordersLoading);
  const operationsLoading = useCourierStore((state) => state.operationsLoading);
  const operationsSummary = useCourierStore((state) => state.operationsSummary);
  const refreshAll = useCourierStore((state) => state.refreshAll);

  useFocusEffect(
    useCallback(() => {
      void refreshAll().catch(() => undefined);
    }, [refreshAll]),
  );

  const recentCompletedDeliveries = operationsSummary?.recent_deliveries ?? EMPTY_DELIVERIES;
  const isInitialLoading = !operationsSummary && (ordersLoading || operationsLoading);

  const summary = useMemo(() => {
    const totalEarnings = recentCompletedDeliveries.reduce((sum, delivery) => {
      const deliveryFee = Number(delivery.delivery_fee ?? 0);
      return sum + (Number.isNaN(deliveryFee) ? 0 : deliveryFee);
    }, 0);
    const totalDistance = recentCompletedDeliveries.reduce(
      (sum, delivery) => sum + (typeof delivery.distance_km === "number" ? delivery.distance_km : 0),
      0,
    );
    const totalActiveMinutes = recentCompletedDeliveries.reduce(
      (sum, delivery) => sum + (typeof delivery.duration_minutes === "number" ? delivery.duration_minutes : 0),
      0,
    );

    return {
      deliveries: recentCompletedDeliveries.length,
      earnings: formatCurrencyValue(totalEarnings),
      distance: formatDistanceValue(totalDistance),
      activeTime: formatDurationValue(totalActiveMinutes),
    };
  }, [recentCompletedDeliveries]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 8, 18),
            paddingBottom: Math.max(insets.bottom + 120, 120),
          },
        ]}
        refreshControl={<RefreshControl tintColor={colors.greenDark} refreshing={ordersLoading || operationsLoading} onRefresh={refreshAll} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            hitSlop={12}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
            style={styles.headerButtonGhost}
          >
            <ArrowLeft color={colors.text} size={28} strokeWidth={2.25} />
          </Pressable>

          <Text style={styles.headerTitle}>Curse completate</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <StatBlock value={String(summary.deliveries)} label="Curse" />
            <StatBlock value={summary.earnings} label="Câștiguri" accent noRightBorder />
            <StatBlock value={summary.distance} label="Distanță" noBottomBorder />
            <StatBlock value={summary.activeTime} label="Timp activ" noRightBorder noBottomBorder />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Istoric curse</Text>
        </View>

        <View style={styles.list}>
          {recentCompletedDeliveries.map((delivery) => (
            <Pressable
              key={delivery.id}
              onPress={() => navigation.navigate("CompletedDeliveryDetails", { deliveryId: delivery.id })}
              style={styles.deliveryCard}
            >
              <View style={styles.deliveryCardLeft}>
                <View style={styles.deliveryIconWrap}>
                  <View style={styles.deliveryIconCircle}>
                    <ShoppingBag color={colors.greenDark} size={28} strokeWidth={2.1} />
                  </View>
                  <View style={styles.deliveryCheckBadge}>
                    <Check color={colors.white} size={13} strokeWidth={3} />
                  </View>
                </View>

                <View style={styles.deliveryContent}>
                  <Text style={styles.deliveryCode}>{formatDeliveryCode(delivery)}</Text>
                  <Text style={styles.deliveryMeta}>{formatOrderDate(delivery.completed_at)}</Text>

                  <AddressRow dotColor="#2FC56C" text={delivery.restaurant_name} />
                  <AddressRow dotColor="#FF5A36" text={delivery.dropoff_address || "Adresă indisponibilă"} />
                </View>
              </View>

              <View style={styles.deliveryCardRight}>
                <Text style={styles.deliveryAmount}>{formatCurrencyValue(Number(delivery.delivery_fee ?? 0))}</Text>

                <View style={styles.deliveryInfoList}>
                  <InfoPill icon={<Clock3 color={stylesConfig.infoIcon} size={18} strokeWidth={2.1} />} text={formatDeliveryMinutes(delivery)} />
                  <InfoPill icon={<MapPin color={stylesConfig.infoIcon} size={18} strokeWidth={2.1} />} text={formatDeliveryDistance(delivery)} />
                </View>
              </View>

              <ChevronRight color={stylesConfig.chevron} size={24} strokeWidth={2.2} />
            </Pressable>
          ))}

          {isInitialLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={colors.greenDark} />
              <Text style={styles.loadingText}>Se încarcă istoricul curselor...</Text>
            </View>
          ) : null}

          {!isInitialLoading && !recentCompletedDeliveries.length ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nu există curse finalizate în ultimele 7 zile.</Text>
              <Text style={styles.emptyText}>Istoricul va apărea aici imediat ce backend-ul întoarce livrări completate pentru curierul curent.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function StatBlock({
  value,
  label,
  accent = false,
  noRightBorder = false,
  noBottomBorder = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
  noRightBorder?: boolean;
  noBottomBorder?: boolean;
}) {
  return (
    <View
      style={[
        styles.statBlock,
        noRightBorder && styles.statBlockNoRightBorder,
        noBottomBorder && styles.statBlockNoBottomBorder,
      ]}
    >
      <Text style={[styles.statValue, accent && styles.statValueAccent]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AddressRow({ dotColor, text }: { dotColor: string; text: string }) {
  return (
    <View style={styles.addressRow}>
      <View style={[styles.addressDot, { backgroundColor: dotColor }]} />
      <Text numberOfLines={1} style={styles.addressText}>
        {text}
      </Text>
    </View>
  );
}

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function formatDeliveryCode(delivery: CourierCompletedDelivery) {
  if (delivery.order_id) {
    return `#${delivery.order_id}`;
  }

  return delivery.reference_id ? `#${delivery.reference_id}` : `#${delivery.operation_entry_id}`;
}

function formatCurrencyValue(value: number) {
  if (Number.isNaN(value)) {
    return "0,00 RON";
  }

  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value).concat(" RON");
}

function formatDistanceValue(value: number) {
  return `${new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number.isNaN(value) ? 0 : value)} km`;
}

function formatDurationValue(totalMinutes: number) {
  if (!totalMinutes) {
    return "0m";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(",", " •");
}

function formatDeliveryMinutes(delivery: CourierCompletedDelivery) {
  if (typeof delivery.duration_minutes !== "number" || Number.isNaN(delivery.duration_minutes)) {
    return "0 min";
  }

  return `${delivery.duration_minutes} min`;
}

function formatDeliveryDistance(delivery: CourierCompletedDelivery) {
  if (typeof delivery.distance_km !== "number" || Number.isNaN(delivery.distance_km)) {
    return "0,0 km";
  }

  return formatDistanceValue(delivery.distance_km);
}

const stylesConfig = {
  border: "rgba(17,17,17,0.08)",
  softShadow: "rgba(17,17,17,0.04)",
  iconBg: "#ECF8EF",
  accent: "#27B457",
  infoIcon: "#8F97A8",
  infoText: "#6A7284",
  chevron: "#2A3142",
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flexGrow: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    gap: 22,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: 4,
  },
  headerButtonGhost: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#121826",
    fontSize: 19,
    fontWeight: "800",
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  statsCard: {
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: stylesConfig.border,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statBlock: {
    width: "50%",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderColor: "rgba(17,17,17,0.08)",
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  statBlockNoRightBorder: {
    borderRightWidth: 0,
  },
  statBlockNoBottomBorder: {
    borderBottomWidth: 0,
  },
  statValue: {
    color: "#1B2233",
    fontSize: 14,
    fontWeight: "800",
  },
  statValueAccent: {
    color: stylesConfig.accent,
  },
  statLabel: {
    color: "#374151",
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
  },
  sectionHeader: {
    paddingTop: 2,
  },
  sectionTitle: {
    color: "#1A2233",
    fontSize: 16,
    fontWeight: "800",
  },
  list: {
    gap: 16,
  },
  deliveryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 18,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: stylesConfig.border,
    shadowColor: "#000000",
    shadowOpacity: 0.055,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  deliveryCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  deliveryIconWrap: {
    position: "relative",
    width: 52,
    marginTop: 4,
  },
  deliveryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesConfig.iconBg,
  },
  deliveryCheckBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesConfig.accent,
    borderWidth: 2,
    borderColor: colors.white,
  },
  deliveryContent: {
    flex: 1,
    gap: 7,
  },
  deliveryCode: {
    color: "#161E2C",
    fontSize: 15,
    fontWeight: "800",
  },
  deliveryMeta: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "500",
    marginTop: -2,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addressText: {
    flex: 1,
    color: "#30394C",
    fontSize: 12,
    fontWeight: "500",
  },
  deliveryCardRight: {
    alignItems: "flex-end",
    gap: 22,
    minWidth: 82,
  },
  deliveryAmount: {
    color: stylesConfig.accent,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  deliveryInfoList: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  infoText: {
    color: stylesConfig.infoText,
    fontSize: 11,
    fontWeight: "500",
  },
  loadingCard: {
    minHeight: 112,
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFBFC",
    borderWidth: 1,
    borderColor: stylesConfig.border,
    gap: 10,
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyCard: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: "#FAFBFC",
    borderWidth: 1,
    borderColor: stylesConfig.border,
    gap: 8,
  },
  emptyTitle: {
    color: "#1A2233",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
  },
});
