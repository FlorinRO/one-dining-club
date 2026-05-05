import { MapPin, Plus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { addressesApi } from "../api/addressesApi";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { Address } from "../types/models";

export function AddressScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [label, setLabel] = useState("Birou");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("București");

  useEffect(() => {
    addressesApi.list().then(setAddresses);
  }, []);

  const addLocalAddress = () => {
    if (!line1.trim()) return;
    const address: Address = {
      id: Date.now(),
      label,
      full_name: "Client Demo",
      phone: "+40720000000",
      address_line_1: line1,
      city,
      is_default: !addresses.length,
    };
    setAddresses((current) => [address, ...current]);
    setLine1("");
  };

  const setDefault = (id: number) => {
    setAddresses((current) => current.map((address) => ({ ...address, is_default: address.id === id })));
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Adrese</Text>
        <View style={styles.list}>
          {addresses.map((address) => (
            <Pressable key={address.id} onPress={() => setDefault(address.id)} style={styles.address}>
              <View style={styles.pin}>
                <MapPin size={20} stroke={address.is_default ? colors.background : colors.lime} />
              </View>
              <View style={styles.addressInfo}>
                <View style={styles.row}>
                  <Text style={styles.addressLabel}>{address.label}</Text>
                  {address.is_default && <Text style={styles.defaultBadge}>Implicită</Text>}
                </View>
                <Text style={styles.addressText}>{address.address_line_1}</Text>
                <Text style={styles.addressMuted}>{address.city}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Plus size={20} stroke={colors.lime} />
            <Text style={styles.formTitle}>Adaugă adresă</Text>
          </View>
          <TextInput value={label} onChangeText={setLabel} placeholder="Eticheta" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={line1} onChangeText={setLine1} placeholder="Stradă, număr, bloc" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={city} onChangeText={setCity} placeholder="Oraș" placeholderTextColor={colors.muted} style={styles.input} />
          <PrimaryButton title="Salvează adresa" onPress={addLocalAddress} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 14,
    paddingBottom: 120,
    gap: 18,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
  },
  list: {
    gap: 12,
  },
  address: {
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  pin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
  },
  addressInfo: {
    flex: 1,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  defaultBadge: {
    color: colors.lime,
    fontWeight: "900",
    fontSize: 12,
  },
  addressText: {
    color: colors.text,
    fontWeight: "700",
  },
  addressMuted: {
    color: colors.muted,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  formTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  input: {
    height: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    color: colors.text,
    backgroundColor: colors.cardSoft,
    fontSize: 16,
  },
});
