import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import LottieView from "lottie-react-native";

import { authApi } from "../api/authApi";
import { useSocialAuth } from "../lib/socialAuth";
import { AuthStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const setSession = useAuthStore((state) => state.setSession);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleSocialSuccess = useCallback((session: Awaited<ReturnType<typeof authApi.socialLogin>>) => setSession(session), [setSession]);
  const handleSocialError = useCallback((message: string) => setError(message), []);
  const { loadingProvider: socialLoading, startSocialLogin } = useSocialAuth({
    onSuccess: handleSocialSuccess,
    onError: handleSocialError,
  });

  const submit = async () => {
    if (!firstName || !email || password.length < 8) {
      setError("Completează prenumele, emailul și o parolă de minimum 8 caractere.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authApi.register({
        email: email.trim(),
        phone,
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      navigation.navigate("Login");
    } catch {
      setError("Nu am putut crea contul. Verifică dacă emailul nu este deja folosit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
      <View style={styles.screen}>
        <View style={styles.hero}>
          <Pressable style={styles.backButton} onPress={() => navigation.navigate("Login")}>
            <ArrowLeft color={colors.red} size={24} strokeWidth={2.3} />
          </Pressable>

          <Image source={require("../../assets/one-dining-logo.png")} style={styles.heroLogo} resizeMode="contain" />

          <View style={styles.animationWrap} pointerEvents="none">
            <LottieView
              source={require("../../assets/man-delivery.lottie")}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
          </View>

          <View style={styles.heroBubbleLarge} />
          <View style={styles.heroBubbleSmall} />
        </View>

        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <View style={styles.card}>
              <Text style={styles.title}>Creează cont</Text>
              <Text style={styles.subtitle}>Salvăm adresele, comenzile și restaurantele preferate.</Text>

              <View style={styles.socialRow}>
                <SocialButton label="G" title="Google" color="#FFFFFF" textColor="#DB4437" loading={socialLoading === "google"} onPress={() => { setError(null); startSocialLogin("google"); }} />
                <SocialButton label="f" title="Facebook" color="#1877F2" textColor="#FFFFFF" loading={socialLoading === "facebook"} onPress={() => { setError(null); startSocialLogin("facebook"); }} />
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>sau cu email</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.form}>
                <View style={styles.nameRow}>
                  <View style={[styles.inputWrap, styles.nameInput]}>
                    <UserRound color={colors.muted} size={19} />
                    <TextInput value={firstName} onChangeText={setFirstName} placeholder="Prenume" placeholderTextColor={colors.muted} style={styles.input} />
                  </View>
                  <View style={[styles.inputWrap, styles.nameInput]}>
                    <UserRound color={colors.muted} size={19} />
                    <TextInput value={lastName} onChangeText={setLastName} placeholder="Nume" placeholderTextColor={colors.muted} style={styles.input} />
                  </View>
                </View>
                <View style={styles.inputWrap}>
                  <Mail color={colors.muted} size={20} />
                  <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.muted} style={styles.input} />
                </View>
                <View style={styles.inputWrap}>
                  <Phone color={colors.muted} size={20} />
                  <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Telefon" placeholderTextColor={colors.muted} style={styles.input} />
                </View>
                <View style={styles.inputWrap}>
                  <LockKeyhole color={colors.muted} size={20} />
                  <TextInput value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholder="Parolă" placeholderTextColor={colors.muted} style={styles.input} />
                  <Pressable onPress={() => setShowPassword((value) => !value)}>
                    {showPassword ? <EyeOff color={colors.muted} size={20} /> : <Eye color={colors.muted} size={20} />}
                  </Pressable>
                </View>
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable disabled={loading} onPress={submit} style={({ pressed }) => [styles.primaryButton, pressed && !loading && styles.pressed, loading && styles.disabled]}>
                <Text style={styles.primaryText}>{loading ? "Se creează..." : "Creează cont"}</Text>
              </Pressable>

              <Pressable style={styles.footerLink} onPress={() => navigation.navigate("Login")}>
                <Text style={styles.footerText}>Ai deja cont? <Text style={styles.footerAccent}>Intră în cont</Text></Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

type SocialButtonProps = {
  label: string;
  title: string;
  color: string;
  textColor: string;
  loading: boolean;
  onPress: () => void;
};

function SocialButton({ label, title, color, textColor, loading, onPress }: SocialButtonProps) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}>
      <View style={[styles.socialIcon, { backgroundColor: color }]}>
        <Text style={[styles.socialLetter, { color: textColor }]}>{label}</Text>
      </View>
      <Text style={styles.socialText}>{loading ? "Se deschide..." : title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.white },
  screen: { flex: 1, backgroundColor: colors.white },
  hero: { flex: 1, paddingHorizontal: 24, paddingTop: 56, overflow: "hidden", backgroundColor: colors.white },
  backButton: {
    position: "absolute",
    left: 24,
    top: 56,
    zIndex: 30,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F1",
  },
  heroLogo: {
    position: "absolute",
    alignSelf: "center",
    bottom: "84%",
    width: 146,
    height: 146,
  },
  animationWrap: {
    position: "absolute",
    left: 8,
    right: 10,
    bottom: 112,
    height: 350,
    alignItems: "center",
    justifyContent: "center",
  },
  lottieAnimation: { width: 430, height: 430 },
  heroBubbleLarge: { position: "absolute", right: -52, top: 78, width: 152, height: 152, borderRadius: 76, backgroundColor: "#FFF1F1" },
  heroBubbleSmall: { position: "absolute", left: 38, bottom: 118, width: 28, height: 28, borderRadius: 14, backgroundColor: "#FFE1E1" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    maxHeight: "82%",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.red,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    backgroundColor: colors.white,
    shadowColor: "#18181B",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 14,
  },
  sheetContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 34 },
  card: { backgroundColor: colors.white },
  title: { color: "#121212", fontSize: 31, fontWeight: "700" },
  subtitle: { marginTop: 8, color: "#71717A", fontSize: 16, lineHeight: 23, fontWeight: "400" },
  socialRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  socialButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#F6DADA",
  },
  socialIcon: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  socialLetter: { fontSize: 16, fontWeight: "700" },
  socialText: { color: "#202124", fontSize: 15, fontWeight: "600" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: "#EFEFF1" },
  dividerText: { color: "#A1A1AA", fontSize: 13, fontWeight: "600", textTransform: "uppercase" },
  form: { gap: 12 },
  nameRow: { flexDirection: "row", gap: 10 },
  nameInput: { flex: 1, paddingHorizontal: 12 },
  inputWrap: { minHeight: 60, borderRadius: 20, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FAFAFA", borderWidth: 1, borderColor: "#F0F0F2" },
  input: { flex: 1, color: "#18181B", fontSize: 16, fontWeight: "400" },
  error: { marginTop: 16, color: colors.redDark, fontSize: 14, fontWeight: "500" },
  primaryButton: {
    alignSelf: "center",
    marginTop: 22,
    minWidth: 210,
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red,
    shadowColor: "#B91C1C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
  },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  footerLink: { alignItems: "center", paddingTop: 20 },
  footerText: { color: "#71717A", fontSize: 16, fontWeight: "400" },
  footerAccent: { color: colors.red, fontWeight: "700" },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  disabled: { opacity: 0.55 },
});
