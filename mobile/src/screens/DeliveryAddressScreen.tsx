import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Check, Crosshair, MapPin, X } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";

import { addressesApi } from "../api/addressesApi";
import { FoodBackground } from "../components/FoodBackground";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { HomeStackParamList } from "../navigation/types";
import { useI18n } from "../i18n/useI18n";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";
import { Address } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "DeliveryAddress">;

type AddressOption = {
  slot: "map" | "auto";
  displayLabel: string;
  address: Address;
};

const ACCENT_GREEN = "#22C55E";
const ACCENT_GREEN_DARK = "#16A34A";

export function DeliveryAddressScreen({ navigation }: Props) {
  const { tr } = useI18n();
  const colorScheme = useColorScheme();
  const separatorColor = colorScheme === "dark" ? "#1A1A1A" : colors.border;
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoLocationTriggeredRef = useRef(false);
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();

  const loadAddresses = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!accessToken) {
        setAddresses([]);
        setError(tr("Intră în cont ca să vezi adresele.", "Sign in to view addresses."));
        return;
      }

      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await addressesApi.list();
        setAddresses(data);
      } catch {
        setError(tr("Nu am putut încărca adresele.", "Could not load addresses."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  const visibleAddresses = useMemo(() => {
    const bySlot: Partial<Record<AddressOption["slot"], Address>> = {};

    const rank = (item: Address) => {
      const defaultBonus = item.is_default ? 100 : 0;
      return defaultBonus + item.id;
    };

    const normalize = (value: string) => value.trim().toLowerCase();
    const isAuto = (label: string) => {
      const text = normalize(label);
      return text.includes("loca") || text.includes("automat");
    };

    for (const address of addresses) {
      const slot: AddressOption["slot"] = isAuto(address.label) ? "auto" : "map";
      const existing = bySlot[slot];
      if (!existing || rank(address) > rank(existing)) {
        bySlot[slot] = address;
      }
    }

    const ordered: AddressOption[] = [];
    if (bySlot.map) ordered.push({ slot: "map", displayLabel: tr("Adresă din hartă", "Map address"), address: bySlot.map });
    if (bySlot.auto) ordered.push({ slot: "auto", displayLabel: tr("Adresă detectată automat", "Auto-detected address"), address: bySlot.auto });

    return ordered;
  }, [addresses]);

  const setDefault = async (id: number) => {
    const previous = addresses;
    setSavingId(id);
    setError(null);
    setAddresses((current) => current.map((address) => ({ ...address, is_default: address.id === id })));
    try {
      const updated = await addressesApi.setDefault(id);
      setAddresses((current) => current.map((address) => (address.id === id ? updated : { ...address, is_default: false })));
      navigation.goBack();
    } catch {
      setAddresses(previous);
      setError(tr("Nu am putut seta adresa implicită.", "Could not set default address."));
    } finally {
      setSavingId(null);
    }
  };

  const saveCurrentLocation = useCallback(async () => {
    if (!accessToken) {
      Alert.alert(tr("Autentificare necesară", "Authentication required"), tr("Intră în cont ca să setezi locația curentă.", "Sign in to set current location."));
      return;
    }

    setSavingCurrent(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(tr("Permisiune necesară", "Permission required"), tr("Activează locația pentru a folosi locația curentă.", "Enable location to use current location."));
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      const [geo] = await Location.reverseGeocodeAsync(coords);
      const line1 = [geo?.street, geo?.streetNumber].filter(Boolean).join(" ") || [geo?.district, geo?.subregion].filter(Boolean).join(", ") || tr("Locație curentă", "Current location");
      const city = geo?.city || geo?.region || "Romania";
      const fullName = user?.full_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || tr("Client", "Customer");
      const phone = user?.phone || "N/A";

      const allAddresses = await addressesApi.list();
      const existingMatch = allAddresses.find(
        (item) =>
          item.address_line_1.trim().toLowerCase() === line1.trim().toLowerCase() &&
          item.city.trim().toLowerCase() === city.trim().toLowerCase(),
      );

      if (existingMatch) {
        await addressesApi.update(existingMatch.id, {
          label: tr("Adresă detectată automat", "Auto-detected address"),
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6),
        });
      } else {
        const created = await addressesApi.create({
          label: tr("Adresă detectată automat", "Auto-detected address"),
          full_name: fullName,
          phone,
          address_line_1: line1,
          city,
          instructions: "",
          is_default: false,
        });

        await addressesApi.update(created.id, {
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6),
        });
      }
      await loadAddresses();
    } catch {
      setError(tr("Nu am putut seta locația curentă.", "Could not set current location."));
    } finally {
      setSavingCurrent(false);
    }
  }, [accessToken, loadAddresses, user?.first_name, user?.full_name, user?.last_name, user?.phone]);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
      if (!autoLocationTriggeredRef.current) {
        autoLocationTriggeredRef.current = true;
        setTimeout(() => {
          void saveCurrentLocation();
        }, 180);
      }
    }, [loadAddresses, saveCurrentLocation]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <FoodBackground />
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
            <X size={24} stroke={colors.text} />
          </Pressable>
          <Text style={styles.title}>{tr("Adresa de livrare", "Delivery address")}</Text>
        </View>

        <Pressable style={styles.mapRow} onPress={() => navigation.navigate("DeliveryAddressMap")}>
          <View style={[styles.mapIconWrap, { borderColor: separatorColor }]}>
            <MapPin size={14} stroke={ACCENT_GREEN} />
          </View>
          <Text style={styles.mapText}>{tr("Alege pe hartă", "Choose on map")}</Text>
        </Pressable>
        {savingCurrent ? <Text style={styles.autoLocationText}>{tr("Setăm automat locația curentă...", "Setting current location automatically...")}</Text> : null}

        <View style={[styles.divider, { backgroundColor: separatorColor }]} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={trackFloatingCartScrollDirection}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAddresses("refresh")} tintColor={ACCENT_GREEN} />}
        >
          {loading ? (
            <View style={styles.statusBox}>
              <ActivityIndicator color={ACCENT_GREEN} />
              <Text style={styles.statusText}>{tr("Se încarcă adresele...", "Loading addresses...")}</Text>
            </View>
          ) : null}

          {!loading &&
            visibleAddresses.map((item) => {
              const isSelected = item.address.is_default;
              return (
                <Pressable key={item.slot} style={[styles.item, { borderBottomColor: separatorColor }]} onPress={() => setDefault(item.address.id)} disabled={savingId !== null}>
                  <View style={styles.itemLeft}>
                    <View style={styles.itemIconWrap}>{iconFor(item.displayLabel)}</View>
                    <View style={styles.itemTextWrap}>
                      <Text style={styles.itemTitle}>{item.displayLabel}</Text>
                      <Text style={styles.itemSubtitle}>{item.address.address_line_1}</Text>
                      <Text style={styles.itemSubtitle}>{item.address.city}</Text>
                    </View>
                  </View>
                  {isSelected ? (
                    <View style={styles.selectedBadge}>
                      <Check size={14} stroke={colors.white} strokeWidth={2.8} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}

          {!loading && !visibleAddresses.length ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>{tr("Nu ai adrese salvate încă.", "You have no saved addresses yet.")}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.statusBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={() => loadAddresses()}>
                <Text style={styles.retryText}>{tr("Reîncearcă", "Try again")}</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function iconFor(label: string) {
  const value = label.trim().toLowerCase();
  if (value.includes("hart") || value.includes("map")) return <MapPin size={20} stroke={colors.text} strokeWidth={2.3} />;
  if (value.includes("automat") || value.includes("detect") || value.includes("auto")) return <Crosshair size={20} stroke={colors.text} strokeWidth={2.3} />;
  return <MapPin size={20} stroke={colors.text} strokeWidth={2.3} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#050505",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  header: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  closeButton: {
    position: "absolute",
    left: 0,
    top: 8,
    padding: 4,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.text,
  },
  mapRow: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  mapIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  mapText: {
    fontSize: 16,
    lineHeight: 22,
    color: ACCENT_GREEN,
    fontWeight: "600",
  },
  autoLocationText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 20,
  },
  item: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 14,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  itemIconWrap: {
    width: 24,
    alignItems: "center",
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    fontWeight: "400",
  },
  itemSubtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBox: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 10,
  },
  statusText: {
    color: colors.muted,
    fontSize: 14,
  },
  errorText: {
    color: ACCENT_GREEN_DARK,
    fontSize: 14,
  },
  retryButton: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: ACCENT_GREEN,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    color: ACCENT_GREEN,
    fontWeight: "600",
    fontSize: 13,
  },
});
