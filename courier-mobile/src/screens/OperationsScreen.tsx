import { useFocusEffect } from "@react-navigation/native";
import { Clock3, MapPinned, PackageCheck, ShieldCheck } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SectionHeader } from "../components/SectionHeader";
import { formatMinutes, formatRelativeDate, titleCaseVehicle } from "../lib/format";
import { useAuthStore } from "../store/authStore";
import { useCourierStore } from "../store/courierStore";
import { colors } from "../theme/colors";
import { CourierOrder, CourierProfile } from "../types/models";

export function OperationsScreen() {
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const profile = useCourierStore((state) => state.profile);
  const orders = useCourierStore((state) => state.orders);
  const trackingActive = useCourierStore((state) => state.trackingActive);
  const ordersLoading = useCourierStore((state) => state.ordersLoading);
  const refreshAll = useCourierStore((state) => state.refreshAll);

  const myOrders = useMemo(() => orders.filter((order) => order.courier === currentUserId), [currentUserId, orders]);
  const activeOrder = useMemo(
    () => myOrders.find((order) => !["delivered", "cancelled", "rejected"].includes(order.order_status)) ?? null,
    [myOrders],
  );
  const completedOrders = useMemo(
    () => myOrders.filter((order) => ["delivered", "cancelled", "rejected"].includes(order.order_status)),
    [myOrders],
  );
  const completedToday = useMemo(() => completedOrders.filter((order) => isToday(order.updated_at)).length, [completedOrders]);
  const totalDistanceToday = useMemo(
    () =>
      myOrders.reduce((sum, order) => {
        if (!isToday(order.updated_at)) {
          return sum;
        }
        return sum + (typeof order.estimated_distance_km === "number" ? order.estimated_distance_km : 0);
      }, 0),
    [myOrders],
  );
  const averageEta = useMemo(() => {
    const trackedOrders = myOrders.filter((order) => typeof order.estimated_arrival_minutes === "number");
    if (!trackedOrders.length) {
      return null;
    }
    return Math.round(
      trackedOrders.reduce((sum, order) => sum + Number(order.estimated_arrival_minutes ?? 0), 0) / trackedOrders.length,
    );
  }, [myOrders]);
  const activeAlert = useMemo(() => buildActiveAlert(profile, activeOrder, trackingActive), [activeOrder, profile, trackingActive]);

  useFocusEffect(
    useCallback(() => {
      void refreshAll().catch(() => undefined);
    }, [refreshAll]),
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 18) }]}
      refreshControl={<RefreshControl tintColor={colors.lime} refreshing={ordersLoading} onRefresh={refreshAll} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <SectionHeader eyebrow="Operations" title="Panou live" subtitle="Metrici și starea operațională a turei tale curente." />
        <View style={styles.heroStatRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{completedToday}</Text>
            <Text style={styles.heroStatLabel}>completed today</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{totalDistanceToday.toFixed(1)} km</Text>
            <Text style={styles.heroStatLabel}>distance today</Text>
          </View>
        </View>
      </View>

      <View style={styles.metricsList}>
        <MetricRow label="Completed today" value={String(completedToday)} hint="Livrări finalizate astăzi" />
        <MetricRow label="Distance today" value={`${totalDistanceToday.toFixed(1)} km`} hint="Distanță estimată procesată" />
        <MetricRow label="Avg ETA" value={averageEta ? formatMinutes(averageEta) : "N/A"} hint="Medie pe curse urmărite" />
        <MetricRow label="Vehicle" value={profile ? titleCaseVehicle(profile.vehicle_type) : "N/A"} hint="Vehicul folosit în tură" />
      </View>

      <View style={styles.section}>
        <AlertBanner title={activeAlert.title} description={activeAlert.description} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Operational details</Text>
        <View style={styles.detailList}>
          <InsightRow
            icon={<ShieldCheck color={colors.lime} size={17} />}
            title="Verification"
            value={profile?.is_verified ? "Verified" : "Pending"}
            description="Contul de curier și documentele operaționale."
          />
          <InsightRow
            icon={<Clock3 color={colors.lime} size={17} />}
            title="Last profile sync"
            value={profile?.updated_at ? formatRelativeDate(profile.updated_at) : "Pending"}
            description="Ultimul update primit din backend pentru profil și locație."
          />
          <InsightRow
            icon={<PackageCheck color={colors.lime} size={17} />}
            title="Active run"
            value={activeOrder ? `#${activeOrder.id}` : "None"}
            description={activeOrder ? "Există o cursă activă în fluxul curent." : "Nu există nicio cursă activă în acest moment."}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function MetricRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricHint}>{hint}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function InsightRow({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <View style={styles.insightRow}>
      <View style={styles.insightLead}>
        <View style={styles.insightIconWrap}>{icon}</View>
        <View style={styles.insightTextWrap}>
          <Text style={styles.insightTitle}>{title}</Text>
          <Text style={styles.insightDescription}>{description}</Text>
        </View>
      </View>
      <Text style={styles.insightValue}>{value}</Text>
    </View>
  );
}

function AlertBanner({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.alertBanner}>
      <View style={styles.alertIconWrap}>
        <MapPinned color={colors.lime} size={18} />
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
      title: "Verificare incompletă",
      description: "Contul de curier este funcțional, dar verificarea rămâne vizibilă ca prioritate operațională.",
    };
  }
  if (profile?.is_available && !trackingActive) {
    return {
      title: "Tracking inactiv",
      description: "Ești online, dar tracking-ul de fundal nu rulează încă. Actualizează locația și acordă permisiunile necesare.",
    };
  }
  if (activeOrder?.customer_note) {
    return {
      title: "Instrucțiuni client",
      description: activeOrder.customer_note,
    };
  }
  if (!profile?.current_latitude || !profile?.current_longitude) {
    return {
      title: "Lipsă poziție live",
      description: "Trimite prima poziție din dashboard pentru ETA-uri și routing mai bune.",
    };
  }
  return {
    title: "Flux stabil",
    description: "Dashboardul este sincronizat, iar aplicația poate primi și procesa următoarea cursă.",
  };
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: 26,
    paddingVertical: 18,
    paddingBottom: 260,
  },
  hero: {
    paddingHorizontal: 18,
    gap: 18,
  },
  heroStatRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 16,
    paddingBottom: 6,
  },
  heroStat: {
    flex: 1,
    gap: 2,
  },
  heroStatValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
  },
  heroStatLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroDivider: {
    width: 1,
    backgroundColor: "rgba(17,17,17,0.12)",
  },
  metricsList: {
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(17,17,17,0.1)",
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(17,17,17,0.08)",
  },
  metricCopy: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  metricHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    gap: 16,
    paddingHorizontal: 18,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  alertBanner: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    paddingVertical: 2,
  },
  alertIconWrap: {
    width: 28,
    alignItems: "center",
    paddingTop: 2,
  },
  alertTextWrap: {
    flex: 1,
    gap: 6,
  },
  alertTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  alertDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  detailList: {
    borderTopWidth: 1,
    borderTopColor: "rgba(17,17,17,0.1)",
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(17,17,17,0.08)",
  },
  insightLead: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  insightIconWrap: {
    width: 24,
    alignItems: "center",
    paddingTop: 2,
  },
  insightTextWrap: {
    flex: 1,
    gap: 4,
  },
  insightTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  insightValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "right",
  },
  insightDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
