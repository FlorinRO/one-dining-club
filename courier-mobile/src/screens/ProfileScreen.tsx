import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { authApi } from "../api/authApi";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { SectionHeader } from "../components/SectionHeader";
import { useAuthStore } from "../store/authStore";
import { useCourierStore } from "../store/courierStore";
import { colors } from "../theme/colors";
import { titleCaseVehicle } from "../lib/format";

export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);
  const resetCourierState = useCourierStore((state) => state.reset);
  const profile = useCourierStore((state) => state.profile);
  const refreshProfile = useCourierStore((state) => state.refreshProfile);
  const setAvailability = useCourierStore((state) => state.setAvailability);
  const syncCurrentLocation = useCourierStore((state) => state.syncCurrentLocation);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [syncingLocation, setSyncingLocation] = useState(false);

  const handleAvailability = async (value: boolean) => {
    setSavingAvailability(true);
    try {
      await setAvailability(value);
    } catch (error) {
      Alert.alert("Availability update failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleLocationSync = async () => {
    setSyncingLocation(true);
    try {
      const result = await syncCurrentLocation();
      Alert.alert(result.ok ? "Location updated" : "Location unavailable", result.message);
    } catch (error) {
      Alert.alert("Location update failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSyncingLocation(false);
    }
  };

  const handleLogout = () => {
    if (refreshToken) {
      void authApi.logout(refreshToken).catch(() => undefined);
    }
    resetCourierState();
    logout();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader eyebrow="Courier" title={user?.full_name || user?.email || "Courier profile"} subtitle="Operational profile linked to the existing Yumzy backend courier account." />

      {!profile ? (
        <EmptyState title="Profile is still loading." description="Pull again in a second if your courier profile has not been provisioned yet." action={<PrimaryButton title="Retry profile" onPress={refreshProfile} />} />
      ) : (
        <>
          <View style={styles.card}>
            <ProfileRow label="Name" value={user?.full_name || "-"} />
            <ProfileRow label="Phone" value={profile.phone || user?.phone || "-"} />
            <ProfileRow label="Email" value={user?.email || "-"} />
            <ProfileRow label="Vehicle" value={titleCaseVehicle(profile.vehicle_type)} />
            <ProfileRow label="Verification" value={profile.is_verified ? "Verified" : "Pending"} />
          </View>

          <View style={styles.card}>
            <View style={styles.availabilityRow}>
              <View style={styles.availabilityText}>
                <Text style={styles.label}>Availability</Text>
                <Text style={styles.value}>{profile.is_available ? "You are accepting deliveries." : "You are hidden from new delivery claims."}</Text>
              </View>
              <Switch
                trackColor={{ false: "rgba(255,255,255,0.18)", true: "rgba(184,242,109,0.32)" }}
                thumbColor={profile.is_available ? colors.lime : "#F2F2F2"}
                value={profile.is_available}
                disabled={savingAvailability}
                onValueChange={handleAvailability}
              />
            </View>

            <PrimaryButton title={syncingLocation ? "Updating location..." : "Sync live location"} onPress={handleLocationSync} variant="ghost" disabled={syncingLocation} />
          </View>

          <PrimaryButton title="Log out" onPress={handleLogout} />
        </>
      )}
    </ScrollView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#090909",
  },
  content: {
    padding: 18,
    gap: 18,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 18,
    gap: 18,
  },
  row: {
    gap: 6,
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  value: {
    color: colors.white,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  availabilityText: {
    flex: 1,
    gap: 6,
  },
});
