import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ArrowLeft, CheckCircle2, Home, MapPin, Pencil, Plus, Trash2, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { addressesApi } from "../api/addressesApi";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";
import { Address } from "../types/models";

export function AddressScreen() {
  const navigation = useNavigation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [label, setLabel] = useState("Acasă");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("București");
  const [instructions, setInstructions] = useState("");
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const loadAddresses = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!accessToken) {
        setAddresses([]);
        setError("Intră în cont ca să gestionezi adresele.");
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
        setError("Nu am putut încărca adresele din backend.");
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
    }, [loadAddresses]),
  );

  const resetForm = () => {
    setEditingAddress(null);
    setLabel("Acasă");
    setLine1("");
    setCity("București");
    setInstructions("");
    setError(null);
  };

  const startEdit = (address: Address) => {
    setEditingAddress(address);
    setLabel(address.label);
    setLine1(address.address_line_1);
    setCity(address.city);
    setInstructions(address.instructions ?? "");
    setError(null);
  };

  const saveAddress = async () => {
    if (!accessToken) {
      setError("Intră în cont ca să salvezi adrese.");
      return;
    }
    if (!line1.trim() || !city.trim()) {
      setError("Completează strada și orașul.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      label: label.trim() || "Adresă",
      full_name: user?.full_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Client",
      phone: user?.phone || "N/A",
      address_line_1: line1.trim(),
      city: city.trim(),
      instructions: instructions.trim(),
    };

    try {
      if (editingAddress) {
        const updated = await addressesApi.update(editingAddress.id, payload);
        setAddresses((current) => current.map((address) => (address.id === updated.id ? updated : address)));
      } else {
        const created = await addressesApi.create({ ...payload, is_default: addresses.length === 0 });
        setAddresses((current) => [created, ...current.map((address) => ({ ...address, is_default: created.is_default ? false : address.is_default }))]);
      }
      resetForm();
    } catch {
      setError("Nu am putut salva adresa. Verifică datele și conexiunea cu backend-ul.");
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: number) => {
    const previous = addresses;
    setAddresses((current) => current.map((address) => ({ ...address, is_default: address.id === id })));
    try {
      const updated = await addressesApi.setDefault(id);
      setAddresses((current) => current.map((address) => (address.id === id ? updated : { ...address, is_default: false })));
    } catch {
      setAddresses(previous);
      setError("Nu am putut seta adresa implicită.");
    }
  };

  const deleteAddress = (address: Address) => {
    Alert.alert("Șterge adresa", `Ștergi adresa „${address.label}”?`, [
      { text: "Anulează", style: "cancel" },
      {
        text: "Șterge",
        style: "destructive",
        onPress: async () => {
          try {
            await addressesApi.remove(address.id);
            setAddresses((current) => current.filter((item) => item.id !== address.id));
            if (editingAddress?.id === address.id) resetForm();
          } catch {
            setError("Nu am putut șterge adresa.");
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={() => loadAddresses("refresh")} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Adrese</Text>
            <Text style={styles.subtitle}>Gestionate direct prin backend</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.red} />
            <Text style={styles.mutedText}>Se încarcă adresele...</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {addresses.map((address) => (
              <View key={address.id} style={styles.address}>
                <Pressable style={styles.addressMain} onPress={() => setDefault(address.id)}>
                  <View style={[styles.pin, address.is_default && styles.pinActive]}>
                    <MapPin size={20} stroke={address.is_default ? colors.white : colors.red} strokeWidth={2.2} />
                  </View>
                  <View style={styles.addressInfo}>
                    <View style={styles.row}>
                      <Text style={styles.addressLabel}>{address.label}</Text>
                      {address.is_default && (
                        <View style={styles.defaultBadge}>
                          <CheckCircle2 size={13} color={colors.red} strokeWidth={2.4} />
                          <Text style={styles.defaultBadgeText}>Implicită</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.addressText}>{address.address_line_1}</Text>
                    <Text style={styles.addressMuted}>{address.city}</Text>
                    {!!address.instructions && <Text style={styles.instructions}>{address.instructions}</Text>}
                  </View>
                </Pressable>
                <View style={styles.addressActions}>
                  <Pressable style={styles.iconAction} onPress={() => startEdit(address)}>
                    <Pencil size={17} color={colors.text} strokeWidth={2.2} />
                  </Pressable>
                  <Pressable style={styles.iconAction} onPress={() => deleteAddress(address)}>
                    <Trash2 size={17} color={colors.redDark} strokeWidth={2.2} />
                  </Pressable>
                </View>
              </View>
            ))}

            {!addresses.length && !error && (
              <View style={styles.emptyBox}>
                <Home size={24} color={colors.red} strokeWidth={2.2} />
                <Text style={styles.emptyTitle}>Nu ai adrese salvate</Text>
                <Text style={styles.emptyText}>Adaugă o adresă ca să poți plasa comenzi reale.</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.formHeader}>
            {editingAddress ? <Pencil size={20} stroke={colors.red} /> : <Plus size={20} stroke={colors.red} />}
            <Text style={styles.formTitle}>{editingAddress ? "Editează adresa" : "Adaugă adresă"}</Text>
            {editingAddress && (
              <Pressable style={styles.cancelEdit} onPress={resetForm}>
                <X size={17} color={colors.text} />
              </Pressable>
            )}
          </View>
          <TextInput value={label} onChangeText={setLabel} placeholder="Etichetă" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={line1} onChangeText={setLine1} placeholder="Stradă, număr, bloc" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={city} onChangeText={setCity} placeholder="Oraș" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Instrucțiuni curier"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.instructionsInput]}
            multiline
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton
            title={saving ? "Se salvează..." : editingAddress ? "Salvează modificările" : "Salvează adresa"}
            onPress={saveAddress}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 10,
    paddingBottom: 120,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 3,
    color: colors.muted,
    fontWeight: "700",
  },
  list: {
    gap: 12,
  },
  loadingBox: {
    minHeight: 120,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mutedText: {
    color: colors.muted,
    fontWeight: "700",
  },
  address: {
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  addressMain: {
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  pin: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  addressInfo: {
    flex: 1,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  addressLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  defaultBadge: {
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF1F1",
  },
  defaultBadgeText: {
    color: colors.red,
    fontWeight: "900",
    fontSize: 12,
  },
  addressText: {
    color: colors.text,
    fontWeight: "800",
  },
  addressMuted: {
    color: colors.muted,
    fontWeight: "700",
  },
  instructions: {
    marginTop: 4,
    color: colors.muted,
    lineHeight: 19,
    fontSize: 13,
    fontWeight: "600",
  },
  addressActions: {
    minHeight: 50,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyBox: {
    minHeight: 146,
    borderRadius: 22,
    padding: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.muted,
    textAlign: "center",
    lineHeight: 21,
    fontWeight: "700",
  },
  form: {
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  formHeader: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  formTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  cancelEdit: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    color: colors.text,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    fontWeight: "700",
  },
  instructionsInput: {
    minHeight: 82,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  error: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});
