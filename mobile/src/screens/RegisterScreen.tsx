import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";

import { authApi } from "../api/authApi";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { AuthStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await authApi.register({
        email,
        phone,
        password,
        first_name: firstName,
        last_name: lastName,
      });
      navigation.navigate("Login");
    } catch {
      continueAsGuest();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View>
          <Text style={styles.eyebrow}>Cont client</Text>
          <Text style={styles.title}>Creeaza cont</Text>
        </View>
        <View style={styles.form}>
          <View style={styles.row}>
            <TextInput value={firstName} onChangeText={setFirstName} placeholder="Prenume" placeholderTextColor={colors.muted} style={[styles.input, styles.flex]} />
            <TextInput value={lastName} onChangeText={setLastName} placeholder="Nume" placeholderTextColor={colors.muted} style={[styles.input, styles.flex]} />
          </View>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Telefon" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Parola" placeholderTextColor={colors.muted} style={styles.input} />
          <PrimaryButton title={loading ? "Se creeaza..." : "Creeaza cont"} onPress={submit} disabled={loading || !email || password.length < 8} />
          <PrimaryButton title="Ai deja cont? Intra" variant="ghost" onPress={() => navigation.navigate("Login")} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 28,
  },
  eyebrow: {
    color: colors.lime,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    marginTop: 10,
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
  },
  form: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  input: {
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 16,
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
});

