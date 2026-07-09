import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { ArrowLeft, CalendarClock, CarFront, MapPinned, Wallet } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppTabParamList } from "../navigation/types";
import { formatMinutes, formatMoney, titleCaseVehicle } from "../lib/format";
import { useAuthStore } from "../store/authStore";
import { useCourierStore } from "../store/courierStore";
import { colors } from "../theme/colors";
import { CourierOrder, CourierProfile } from "../types/models";

export function OperationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const profile = useCourierStore((state) => state.profile);
  const operationsSummary = useCourierStore((state) => state.operationsSummary);
  const orders = useCourierStore((state) => state.orders);
  const trackingActive = useCourierStore((state) => state.trackingActive);
  const ordersLoading = useCourierStore((state) => state.ordersLoading);
  const operationsLoading = useCourierStore((state) => state.operationsLoading);
  const refreshAll = useCourierStore((state) => state.refreshAll);

  const myOrders = useMemo(() => orders.filter((order) => order.courier === currentUserId), [currentUserId, orders]);
  const activeOrder = useMemo(
    () => myOrders.find((order) => !["delivered", "cancelled", "rejected"].includes(order.order_status)) ?? null,
    [myOrders],
  );
  const activeAlert = useMemo(() => buildActiveAlert(profile, activeOrder, trackingActive), [activeOrder, profile, trackingActive]);
  const totalDistanceToday = toNumber(operationsSummary?.distance_today_km);
  const averageEta = operationsSummary?.average_eta_minutes ?? null;

  useFocusEffect(
    useCallback(() => {
      void refreshAll().catch(() => undefined);
    }, [refreshAll]),
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 8, 18),
          paddingBottom: Math.max(insets.bottom + 120, 120),
        },
      ]}
      refreshControl={
        <RefreshControl tintColor={colors.greenDark} refreshing={ordersLoading || operationsLoading} onRefresh={refreshAll} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.navigate("Available")} style={styles.headerButtonGhost}>
          <ArrowLeft color={colors.text} size={24} strokeWidth={2.25} />
        </Pressable>
        <Text style={styles.headerTitle}>Operațiuni</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statsGrid}>
          <SummaryBlock value={String(operationsSummary?.completed_today ?? 0)} label="Curse azi" />
          <SummaryBlock value={`${totalDistanceToday.toFixed(1)} km`} label="Distanță azi" noRightBorder />
          <SummaryBlock value={averageEta ? formatMinutes(averageEta) : "N/A"} label="ETA mediu azi" noBottomBorder />
          <SummaryBlock value={formatMoney(operationsSummary?.earnings_today ?? 0)} label="Câștig azi" accent noRightBorder noBottomBorder />
        </View>
      </View>

      <View style={styles.metricsList}>
        <MetricRow
          icon={<CarFront color={colors.black} size={18} />}
          label="Vehicul"
          value={profile ? titleCaseVehicle(profile.vehicle_type) : "N/A"}
          hint="Vehiculul activ al curierului"
          valuePlacement="right"
        />
        <MetricRow
          icon={<CalendarClock color={colors.black} size={18} />}
          label="Timp online azi"
          value={formatMinutes(operationsSummary?.online_minutes_today ?? 0)}
          hint="Durata turelor contorizate de backend"
          valuePlacement="right"
        />
        <MetricRow
          icon={<Wallet color={colors.black} size={18} />}
          label="Câștiguri săptămâna asta"
          value={formatMoney(operationsSummary?.earnings_this_week ?? 0)}
          hint="Taxele de livrare încasate săptămâna aceasta"
          valueTone="success"
        />
        <MetricRow
          icon={<Wallet color={colors.black} size={18} />}
          label="Câștiguri luna asta"
          value={formatMoney(operationsSummary?.earnings_this_month ?? 0)}
          hint="Taxele de livrare încasate luna aceasta"
          valueTone="success"
        />
      </View>

      {activeAlert ? (
        <View style={styles.section}>
          <AlertBanner title={activeAlert.title} description={activeAlert.description} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function SummaryBlock({
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
        styles.summaryBlock,
        noRightBorder && styles.summaryBlockNoRightBorder,
        noBottomBorder && styles.summaryBlockNoBottomBorder,
      ]}
    >
      <Text style={[styles.summaryValue, accent && styles.summaryValueAccent]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function MetricRow({
  icon,
  label,
  value,
  hint,
  valuePlacement = "below",
  valueTone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  valuePlacement?: "below" | "right";
  valueTone?: "default" | "success";
}) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLead}>
        <View style={styles.metricIconWrap}>{icon}</View>
        <View style={styles.metricCopy}>
          <Text style={styles.metricLabel}>{label}</Text>
          {valuePlacement === "below" ? <Text style={[styles.metricValue, valueTone === "success" && styles.metricValueSuccess]}>{value}</Text> : null}
          {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
        </View>
      </View>
      {valuePlacement === "right" ? (
        <Text style={[styles.metricValueRight, valueTone === "success" && styles.metricValueSuccess]}>{value}</Text>
      ) : null}
    </View>
  );
}

function AlertBanner({ title, description }: { title: string; description: string }) {
  return (
      <View style={styles.alertBanner}>
      <View style={styles.alertIconWrap}>
        <MapPinned color={colors.black} size={18} />
      </View>
      <View style={styles.alertTextWrap}>
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertDescription}>{description}</Text>
      </View>
    </View>
  );
}

function buildActiveAlert(profile: CourierProfile | null, activeOrder: CourierOrder | null, trackingActive: boolean) {
  if (!profile?.is_verified) {
    return {
      title: "Verification incomplete",
      description: "Courier account verification still needs attention.",
    };
  }
  if (profile?.is_available && !trackingActive) {
    return {
      title: "Tracking inactive",
      description: "Background tracking is not running yet.",
    };
  }
  if (activeOrder?.customer_note) {
    return {
      title: "Customer instructions",
      description: activeOrder.customer_note,
    };
  }
  return null;
}

function toNumber(value: unknown) {
  const numericValue = Number(value ?? 0);
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: 12,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  headerButtonGhost: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#121826",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.6,
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
    borderColor: "rgba(17,17,17,0.08)",
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
  summaryBlock: {
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
  summaryBlockNoRightBorder: {
    borderRightWidth: 0,
  },
  summaryBlockNoBottomBorder: {
    borderBottomWidth: 0,
  },
  summaryValue: {
    color: "#1B2233",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  summaryValueAccent: {
    color: "#27B457",
  },
  summaryLabel: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  metricsList: {
    gap: 12,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    shadowColor: "#000000",
    shadowOpacity: 0.055,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  metricLead: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    minWidth: 0,
  },
  metricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECF8EF",
  },
  metricCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  metricLabel: {
    color: "#161E2C",
    fontSize: 15,
    fontWeight: "700",
  },
  metricValue: {
    color: "#161E2C",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
    paddingTop: 1,
  },
  metricValueRight: {
    color: "#161E2C",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "right",
    paddingTop: 2,
    flexShrink: 1,
    maxWidth: "42%",
  },
  metricValueSuccess: {
    color: "#27B457",
  },
  metricHint: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: 16,
  },
  alertBanner: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    shadowColor: "#000000",
    shadowOpacity: 0.055,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  alertIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECF8EF",
  },
  alertTextWrap: {
    flex: 1,
    gap: 6,
  },
  alertTitle: {
    color: "#161E2C",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  alertDescription: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 19,
  },
});
