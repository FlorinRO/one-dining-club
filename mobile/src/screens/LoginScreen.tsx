import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";

import { authApi } from "../api/authApi";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { AuthStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const setSession = useAuthStore((state) => state.setSession);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const [email, setEmail] = useState("demo@onedining.club");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const session = await authApi.login(email, password);
      setSession(session);
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
          <Text style={styles.eyebrow}>Bine ai revenit</Text>
          <Text style={styles.title}>Intra in cont</Text>
        </View>
        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Parola"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <PrimaryButton title={loading ? "Se conecteaza..." : "Continua"} onPress={submit} disabled={loading} />
          <PrimaryButton title="Nu ai cont? Creeaza unul" variant="ghost" onPress={() => navigation.navigate("Register")} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 34,
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

