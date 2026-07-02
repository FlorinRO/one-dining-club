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
      <SectionHeader eyebrow="Operations" title="Panou live" subtitle="Metrici și starea operațională a turei tale curente." />

      <View style={styles.metricsGrid}>
        <MetricCard label="Completed today" value={String(completedToday)} hint="Livrări finalizate astăzi" />
        <MetricCard label="Distance today" value={`${totalDistanceToday.toFixed(1)} km`} hint="Distanță estimată procesată" />
        <MetricCard label="Avg ETA" value={averageEta ? formatMinutes(averageEta) : "N/A"} hint="Medie pe curse urmărite" />
        <MetricCard label="Vehicle" value={profile ? titleCaseVehicle(profile.vehicle_type) : "N/A"} hint="Vehicul folosit în tură" />
      </View>

      <View style={styles.section}>
        <AlertBanner title={activeAlert.title} description={activeAlert.description} />
        <View style={styles.operationGrid}>
          <InsightCard
            icon={<ShieldCheck color={colors.lime} size={18} />}
            title="Verification"
            value={profile?.is_verified ? "Verified" : "Pending"}
            description="Contul de curier și documentele operaționale."
          />
          <InsightCard
            icon={<Clock3 color={colors.lime} size={18} />}
            title="Last profile sync"
            value={profile?.updated_at ? formatRelativeDate(profile.updated_at) : "Pending"}
            description="Ultimul update primit din backend pentru profil și locație."
          />
        </View>
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricHint}>{hint}</Text>
    </View>
  );
}

function InsightCard({
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
    <View style={styles.insightCard}>
      <View style={styles.insightIconWrap}>{icon}</View>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightValue}>{value}</Text>
      <Text style={styles.insightDescription}>{description}</Text>
    </View>
  );
}

function AlertBanner({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.alertBanner}>
      <MapPinned color={colors.lime} size={18} />
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
    gap: 16,
    paddingVertical: 18,
    paddingBottom: 120,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 18,
  },
  metricCard: {
    width: "47%",
    padding: 14,
    borderRadius: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.38)",
    gap: 6,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  metricHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    gap: 14,
    paddingHorizontal: 18,
  },
  alertBanner: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderRadius: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.38)",
    padding: 16,
  },
  alertTextWrap: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  alertDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  operationGrid: {
    flexDirection: "row",
    gap: 10,
  },
  insightCard: {
    flex: 1,
    padding: 16,
    borderRadius: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.38)",
    gap: 10,
  },
  insightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(184,242,109,0.12)",
  },
  insightTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  insightValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  insightDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
