import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Check, Crosshair, House, MapPin, Search, X } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";

import { addressesApi } from "../api/addressesApi";
import { HomeStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";
import { Address } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "DeliveryAddress">;

export function DeliveryAddressScreen({ navigation, route }: Props) {
  const searchInputRef = useRef<TextInput | null>(null);
  const searchFocusAnim = useRef(new Animated.Value(0)).current;
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const loadAddresses = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!accessToken) {
        setAddresses([]);
        setError("Intră în cont ca să vezi adresele.");
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
        setError("Nu am putut încărca adresele.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
      if (route.params?.focusSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 120);
        navigation.setParams({ focusSearch: undefined });
      }
    }, [loadAddresses, navigation, route.params?.focusSearch]),
  );

  const filteredAddresses = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return addresses;
    return addresses.filter((address) => {
      const haystack = `${address.label} ${address.address_line_1} ${address.city}`.toLowerCase();
      return haystack.includes(value);
    });
  }, [addresses, query]);

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
      setError("Nu am putut seta adresa implicită.");
    } finally {
      setSavingId(null);
    }
  };

  const animateSearchFocus = useCallback(
    (focused: boolean) => {
      Animated.timing(searchFocusAnim, {
        toValue: focused ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    },
    [searchFocusAnim],
  );

  const saveCurrentLocation = async () => {
    if (!accessToken) {
      Alert.alert("Autentificare necesară", "Intră în cont ca să setezi locația curentă.");
      return;
    }

    setSavingCurrent(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permisiune necesară", "Activează locația pentru a folosi locația curentă.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      const [geo] = await Location.reverseGeocodeAsync(coords);
      const line1 = [geo?.street, geo?.streetNumber].filter(Boolean).join(" ") || [geo?.district, geo?.subregion].filter(Boolean).join(", ") || "Locație curentă";
      const city = geo?.city || geo?.region || "România";
      const fullName = user?.full_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Client";
      const phone = user?.phone || "N/A";

      const existingMatch = addresses.find(
        (item) =>
          item.address_line_1.trim().toLowerCase() === line1.trim().toLowerCase() &&
          item.city.trim().toLowerCase() === city.trim().toLowerCase(),
      );

      if (existingMatch) {
        await addressesApi.update(existingMatch.id, {
          label: "Locația curentă",
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6),
        });
        await addressesApi.setDefault(existingMatch.id);
      } else {
        const created = await addressesApi.create({
          label: "Locația curentă",
          full_name: fullName,
          phone,
          address_line_1: line1,
          city,
          instructions: "",
          is_default: addresses.length === 0,
        });

        await addressesApi.update(created.id, {
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6),
        });
        await addressesApi.setDefault(created.id);
      }
      navigation.goBack();
    } catch {
      setError("Nu am putut seta locația curentă.");
    } finally {
      setSavingCurrent(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
            <X size={24} stroke={colors.text} />
          </Pressable>
          <Text style={styles.title}>Adresa de livrare</Text>
        </View>

        <View style={styles.searchRow}>
          <Animated.View
            style={[
              styles.searchBox,
              {
                marginRight: searchFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 42],
                }),
                borderWidth: searchFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
                borderColor: colors.red,
                backgroundColor: isSearchFocused ? colors.white : "#F1F1F1",
              },
            ]}
          >
            <Search size={20} stroke={colors.text} />
            <TextInput
              ref={searchInputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Caută adresă"
              placeholderTextColor="#676767"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => {
                setIsSearchFocused(true);
                animateSearchFocus(true);
              }}
              onBlur={() => {
                setIsSearchFocused(false);
                animateSearchFocus(false);
              }}
            />
          </Animated.View>
          {isSearchFocused ? (
            <Pressable
              style={styles.searchDismiss}
              onPress={() => {
                searchInputRef.current?.blur();
              }}
            >
              <X size={16} color={colors.text} />
            </Pressable>
          ) : null}
        </View>

        <Pressable style={styles.mapRow} onPress={() => navigation.navigate("DeliveryAddressMap")}>
          <View style={styles.mapIconWrap}>
            <MapPin size={14} stroke={colors.red} />
          </View>
          <Text style={styles.mapText}>Alege pe hartă</Text>
        </Pressable>

        <Pressable style={styles.currentRow} onPress={saveCurrentLocation} disabled={savingCurrent}>
          <View style={styles.currentIconWrap}>
            {savingCurrent ? <ActivityIndicator size="small" color={colors.text} /> : <Crosshair size={14} stroke={colors.text} />}
          </View>
          <Text style={styles.currentText}>{savingCurrent ? "Setăm locația curentă..." : "Locația curentă"}</Text>
        </Pressable>

        <View style={styles.divider} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAddresses("refresh")} tintColor={colors.red} />}
        >
          {loading ? (
            <View style={styles.statusBox}>
              <ActivityIndicator color={colors.red} />
              <Text style={styles.statusText}>Se încarcă adresele...</Text>
            </View>
          ) : null}

          {!loading &&
            filteredAddresses.map((item) => {
              const isSelected = item.is_default;
              return (
                <Pressable key={item.id} style={styles.item} onPress={() => setDefault(item.id)} disabled={savingId !== null}>
                  <View style={styles.itemLeft}>
                    <View style={styles.itemIconWrap}>{iconFor(item.label, item.is_default)}</View>
                    <View style={styles.itemTextWrap}>
                      <Text style={styles.itemTitle}>{item.label}</Text>
                      <Text style={styles.itemSubtitle}>{item.address_line_1}</Text>
                      <Text style={styles.itemSubtitle}>{item.city}</Text>
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

          {!loading && !filteredAddresses.length ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>{query.trim() ? "Nu există adrese pentru căutarea ta." : "Nu ai adrese salvate încă."}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.statusBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={() => loadAddresses()}>
                <Text style={styles.retryText}>Reîncearcă</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function iconFor(label: string, isDefault: boolean) {
  const value = label.trim().toLowerCase();
  if (value.includes("acas")) return <House size={20} stroke={colors.text} strokeWidth={2.3} />;
  if (value.includes("loca") || isDefault) return <Crosshair size={20} stroke={colors.text} strokeWidth={2.3} />;
  return <MapPin size={20} stroke={colors.text} strokeWidth={2.3} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
  searchBox: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#F1F1F1",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
  },
  searchRow: {
    position: "relative",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  searchDismiss: {
    position: "absolute",
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDEDED",
  },
  mapRow: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  currentRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  currentIconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  currentText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    fontWeight: "500",
  },
  mapIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E9E9E9",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  mapText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.red,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E9E9E9",
    marginTop: 20,
  },
  item: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
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
    backgroundColor: colors.red,
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
    color: colors.redDark,
    fontSize: 14,
  },
  retryButton: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    color: colors.red,
    fontWeight: "600",
    fontSize: 13,
  },
});
