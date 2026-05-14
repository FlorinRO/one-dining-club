import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LocateFixed, Search, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Region } from "react-native-maps";
import * as Location from "expo-location";
import { AxiosError } from "axios";

import { addressesApi } from "../api/addressesApi";
import { useI18n } from "../i18n/useI18n";
import { HomeStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<HomeStackParamList, "DeliveryAddressMap">;

type Coordinates = {
  latitude: number;
  longitude: number;
};

const fallback: Coordinates = {
  latitude: 44.4268,
  longitude: 26.1025,
};

const toBackendDecimalString = (value: number) => value.toFixed(6);

function buildLabel(line1: string) {
  const value = line1.toLowerCase();
  if (value.includes("acas") || value.includes("home")) return "Home";
  if (value.includes("birou") || value.includes("office")) return "Office";
  return "Map address";
}

export function DeliveryAddressMapScreen({ navigation }: Props) {
  const { tr } = useI18n();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [coordinate, setCoordinate] = useState<Coordinates>(fallback);
  const [region, setRegion] = useState<Region>({
    ...fallback,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  });
  const [locationReady, setLocationReady] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fullName = useMemo(
    () => user?.full_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Client",
    [user?.first_name, user?.full_name, user?.last_name],
  );
  const phone = user?.phone || "N/A";

  const reverseGeocode = useCallback(async (point: Coordinates) => {
    setResolving(true);
    try {
      const [result] = await Location.reverseGeocodeAsync(point);
      const streetPieces = [result?.street, result?.streetNumber].filter(Boolean);
      const district = [result?.district, result?.subregion].filter(Boolean).join(", ");
      const resolvedLine = streetPieces.join(" ") || district || tr("Adresă necunoscută", "Unknown address");
      setLine1(resolvedLine);
      setCity(result?.city || result?.region || "Romania");
    } catch {
      setLine1(tr("Adresă necunoscută", "Unknown address"));
      setCity("Romania");
    } finally {
      setResolving(false);
    }
  }, []);

  const centerOnCurrentLocation = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(tr("Permisiune necesară", "Permission required"), tr("Activează locația pentru a alege adresa direct de pe hartă.", "Enable location to choose address directly on the map."));
      return;
    }
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const point = {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    };
    setCoordinate(point);
    setRegion((prev) => ({
      ...prev,
      latitude: point.latitude,
      longitude: point.longitude,
    }));
    await reverseGeocode(point);
  }, [reverseGeocode]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await centerOnCurrentLocation();
      } finally {
        if (mounted) setLocationReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [centerOnCurrentLocation]);

  const onRegionChangeComplete = (nextRegion: Region) => {
    setRegion(nextRegion);
    const point = { latitude: nextRegion.latitude, longitude: nextRegion.longitude };
    setCoordinate(point);
    if (geocodeTimerRef.current) {
      clearTimeout(geocodeTimerRef.current);
    }
    geocodeTimerRef.current = setTimeout(() => {
      reverseGeocode(point);
    }, 280);
  };

  useEffect(() => {
    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    };
  }, []);

  const saveAddress = async () => {
    if (!accessToken) {
      Alert.alert(tr("Autentificare necesară", "Authentication required"), tr("Intră în cont ca să salvezi adresa.", "Sign in to save address."));
      return;
    }

    setSaving(true);
    try {
      const allAddresses = await addressesApi.list();
      const isFirstAddress = allAddresses.length === 0;
      const normalizedLine = (line1 || tr("Adresă pe hartă", "Map address")).trim().toLowerCase();
      const normalizedCity = (city || "Romania").trim().toLowerCase();
      const existingMatch = allAddresses.find(
        (item) =>
          item.address_line_1.trim().toLowerCase() === normalizedLine &&
          item.city.trim().toLowerCase() === normalizedCity,
      );

      if (existingMatch) {
        await addressesApi.update(existingMatch.id, {
          label: buildLabel(line1),
          latitude: toBackendDecimalString(coordinate.latitude),
          longitude: toBackendDecimalString(coordinate.longitude),
        });
        await addressesApi.setDefault(existingMatch.id);
        navigation.goBack();
        return;
      }

      const payload = {
        label: buildLabel(line1),
        full_name: fullName,
        phone,
        address_line_1: line1 || tr("Adresă pe hartă", "Map address"),
        city: city || "Romania",
        instructions: "",
        is_default: isFirstAddress,
      };
      const created = await addressesApi.create(payload);
      await addressesApi.update(created.id, {
        latitude: toBackendDecimalString(coordinate.latitude),
        longitude: toBackendDecimalString(coordinate.longitude),
      });
      await addressesApi.setDefault(created.id);
      navigation.goBack();
    } catch (error) {
      const axiosError = error as AxiosError<unknown>;
      const rawData = axiosError.response?.data;
      const details =
        rawData && typeof rawData === "object"
          ? Object.entries(rawData as Record<string, unknown>)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
              .join("\n")
          : rawData
            ? String(rawData)
            : null;
      Alert.alert(tr("Eroare", "Error"), details || tr("Nu am putut salva adresa de pe hartă.", "Could not save map address."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={region} onRegionChangeComplete={onRegionChangeComplete} />

      <View pointerEvents="none" style={styles.centerPinWrap}>
        <View style={styles.centerPin} />
        <View style={styles.centerPinHole} />
        <View style={styles.centerPinStem} />
      </View>

      <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
        <X size={22} color={colors.text} />
      </Pressable>

      <Pressable style={styles.locateButton} onPress={centerOnCurrentLocation}>
        <LocateFixed size={18} color={colors.text} />
      </Pressable>

      <View style={styles.bottomSheet}>
        {!locationReady || resolving ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.red} />
            <Text style={styles.loadingText}>{tr("Căutăm adresa exactă...", "Looking up exact address...")}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sheetTitle}>{tr("Setează adresa de livrare", "Set delivery address")}</Text>
            <Pressable style={styles.addressInput} onPress={() => navigation.navigate("DeliveryAddress", { focusSearch: true })}>
              <Search size={20} color={colors.muted} />
              <Text numberOfLines={1} style={styles.addressLine}>
                {line1 || tr("Adresă pe hartă", "Map address")}
                {city ? `, ${city}` : ""}
              </Text>
            </Pressable>
            <Text style={styles.helperText}>{tr("Mișcă harta astfel încât pinul să fie la intrarea clădirii.", "Move the map so the pin is at the building entrance.")}</Text>
          </>
        )}
        <Pressable style={[styles.saveButton, (saving || resolving || !locationReady) && styles.saveButtonDisabled]} onPress={saveAddress} disabled={saving || resolving || !locationReady}>
          <Text style={styles.saveButtonText}>{saving ? tr("Se salvează...", "Saving...") : tr("Setează adresa", "Set address")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    position: "absolute",
    top: 62,
    left: 16,
  },
  locateButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    position: "absolute",
    right: 16,
    bottom: 288,
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 10,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "500",
  },
  addressInput: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#F1F1F1",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addressLine: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  helperText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
  },
  addressTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  addressCity: {
    color: colors.muted,
    fontSize: 13,
  },
  saveButton: {
    marginTop: 4,
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "500",
  },
  centerPinWrap: {
    position: "absolute",
    left: "50%",
    top: "43%",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -17 }, { translateY: -36 }],
  },
  centerPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.red,
  },
  centerPinHole: {
    position: "absolute",
    top: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
  },
  centerPinStem: {
    width: 4,
    height: 24,
    marginTop: -2,
    borderRadius: 3,
    backgroundColor: colors.red,
  },
});
