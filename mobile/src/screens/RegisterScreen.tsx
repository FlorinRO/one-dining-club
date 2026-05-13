import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Eye, EyeOff, LockKeyhole, Mail, Phone, Star, UserRound } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import LottieView from "lottie-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authApi } from "../api/authApi";
import { useSocialAuth } from "../lib/socialAuth";
import { AuthStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const setSession = useAuthStore((state) => state.setSession);
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useRef(["82%"]).current;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const handleSocialSuccess = useCallback((session: Awaited<ReturnType<typeof authApi.socialLogin>>) => setSession(session), [setSession]);
  const handleSocialError = useCallback((message: string) => setError(message), []);
  const { loadingProvider: socialLoading, startSocialLogin } = useSocialAuth({
    onSuccess: handleSocialSuccess,
    onError: handleSocialError,
  });
  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <>
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.34}
          pressBehavior="none"
        />
        <View pointerEvents="none" style={styles.brandBarOverlay}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>ONE DINING CLUB</Text>
            <Star color={colors.white} fill={colors.white} size={11} strokeWidth={2} />
          </View>
        </View>
      </>
    ),
    [],
  );

  const submit = async () => {
    if (!firstName || !email || password.length < 8) {
      setError("Completează prenumele, emailul și o parolă de minimum 8 caractere.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await authApi.register({
        email: email.trim(),
        phone,
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setPassword("");
      setVerificationEmail(result.email || email.trim());
      setResendMessage("Ți-am trimis un link de confirmare. Verifică Inbox și Spam.");
    } catch {
      setError("Nu am putut crea contul. Verifică dacă emailul nu este deja folosit.");
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!verificationEmail) return;
    setResendLoading(true);
    setResendMessage(null);
    try {
      await authApi.resendEmailVerification(verificationEmail);
      setResendMessage("Am retrimis linkul de confirmare.");
    } catch {
      setResendMessage("Nu am putut retrimite emailul. Încearcă din nou.");
    } finally {
      setResendLoading(false);
    }
  };

  useEffect(() => {
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const hideListener = Keyboard.addListener(hideEvent, () => {
      bottomSheetRef.current?.snapToIndex(0);
    });
    return () => hideListener.remove();
  }, []);

  return (
    <View style={styles.screen}>
        <View style={styles.hero}>
          <View style={styles.brandBar}>
            <View style={styles.brandRow}>
              <Text style={styles.brandText}>ONE DINING CLUB</Text>
              <Star color={colors.white} fill={colors.white} size={11} strokeWidth={2} />
            </View>
          </View>

          <View style={styles.animationWrap} pointerEvents="none">
            <LottieView
              source={require("../../assets/man-delivery.lottie")}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
          </View>

        </View>

        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={false}
          style={styles.sheet}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.handleBar}
          backdropComponent={renderBackdrop}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="none"
          android_keyboardInputMode="adjustResize"
          enableHandlePanningGesture={false}
          enableContentPanningGesture={false}
        >
          <BottomSheetScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}
          >
            <View style={styles.card}>
              {verificationEmail ? (
                <View style={styles.verificationBox}>
                  <View style={styles.verificationIcon}>
                    <Mail color={colors.red} size={26} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.title}>Confirmă emailul</Text>
                  <Text style={styles.subtitle}>
                    Am creat contul pentru {verificationEmail}. Deschide linkul primit pe email, apoi revino la autentificare.
                  </Text>
                  {resendMessage && <Text style={styles.successMessage}>{resendMessage}</Text>}
                  <Pressable disabled={resendLoading} onPress={resendVerification} style={({ pressed }) => [styles.secondaryWideButton, pressed && !resendLoading && styles.pressed, resendLoading && styles.disabled]}>
                    <Text style={styles.secondaryWideText}>{resendLoading ? "Se retrimite..." : "Retrimite emailul"}</Text>
                  </Pressable>
                  <Pressable onPress={() => navigation.navigate("Login")} style={styles.primaryButton}>
                    <Text style={styles.primaryText}>Am confirmat, intră în cont</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={styles.title}>Creează cont</Text>
                  <Text style={styles.subtitle}>Salvăm adresele, comenzile și restaurantele preferate după confirmarea emailului.</Text>

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
                      <View style={[styles.inputWrap, styles.nameInput, focusedField === "firstName" && styles.inputWrapFocused]}>
                        <UserRound color={colors.muted} size={19} />
                        <BottomSheetTextInput value={firstName} onChangeText={setFirstName} onFocus={() => setFocusedField("firstName")} onBlur={() => setFocusedField(null)} placeholder="Prenume" placeholderTextColor={colors.muted} style={styles.input} />
                      </View>
                      <View style={[styles.inputWrap, styles.nameInput, focusedField === "lastName" && styles.inputWrapFocused]}>
                        <UserRound color={colors.muted} size={19} />
                        <BottomSheetTextInput value={lastName} onChangeText={setLastName} onFocus={() => setFocusedField("lastName")} onBlur={() => setFocusedField(null)} placeholder="Nume" placeholderTextColor={colors.muted} style={styles.input} />
                      </View>
                    </View>
                    <View style={[styles.inputWrap, focusedField === "email" && styles.inputWrapFocused]}>
                      <Mail color={colors.muted} size={20} />
                      <BottomSheetTextInput value={email} onChangeText={setEmail} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.muted} style={styles.input} />
                    </View>
                    <View style={[styles.inputWrap, focusedField === "phone" && styles.inputWrapFocused]}>
                      <Phone color={colors.muted} size={20} />
                      <BottomSheetTextInput value={phone} onChangeText={setPhone} onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)} keyboardType="phone-pad" placeholder="Telefon" placeholderTextColor={colors.muted} style={styles.input} />
                    </View>
                    <View style={[styles.inputWrap, focusedField === "password" && styles.inputWrapFocused]}>
                      <LockKeyhole color={colors.muted} size={20} />
                      <BottomSheetTextInput value={password} onChangeText={setPassword} onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} secureTextEntry={!showPassword} placeholder="Parolă" placeholderTextColor={colors.muted} style={styles.input} />
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
                </>
              )}
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
    </View>
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
  screen: { flex: 1, backgroundColor: colors.white },
  hero: { flex: 1, paddingHorizontal: 24, paddingTop: 56, overflow: "hidden", backgroundColor: colors.white },
  brandBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 108,
    backgroundColor: colors.red,
    paddingHorizontal: 22,
    paddingVertical: 6,
  },
  brandBarOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 108,
    backgroundColor: colors.red,
    paddingHorizontal: 22,
    paddingVertical: 6,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
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
  lottieAnimation: { width: "100%", height: "100%" },
  sheet: {
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    shadowColor: "#18181B",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 14,
  },
  sheetBackground: {
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    backgroundColor: colors.white,
  },
  handleBar: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#FFE1E1",
  },
  sheetContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 34 },
  card: { backgroundColor: colors.white },
  verificationBox: { alignItems: "center", paddingVertical: 10 },
  verificationIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: "#FFF1F1",
  },
  title: { color: "#121212", fontSize: 31, fontWeight: "700" },
  subtitle: { marginTop: 8, color: "#71717A", fontSize: 16, lineHeight: 23, fontWeight: "400" },
  successMessage: { marginTop: 16, color: colors.redDark, fontSize: 14, lineHeight: 20, fontWeight: "500", textAlign: "center" },
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
  form: { gap: 12, marginTop: -12 },
  nameRow: { flexDirection: "row", gap: 10 },
  nameInput: { flex: 1, paddingHorizontal: 12 },
  inputWrap: { minHeight: 54, borderRadius: 20, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FAFAFA", borderWidth: 1, borderColor: "#F0F0F2" },
  inputWrapFocused: { borderColor: colors.red, backgroundColor: colors.white },
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
  secondaryWideButton: {
    alignSelf: "center",
    marginTop: 22,
    minWidth: 210,
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#F6DADA",
  },
  secondaryWideText: { color: colors.redDark, fontSize: 15, fontWeight: "700" },
  footerLink: { alignItems: "center", paddingTop: 20 },
  footerText: { color: "#71717A", fontSize: 16, fontWeight: "400" },
  footerAccent: { color: colors.red, fontWeight: "700" },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  disabled: { opacity: 0.55 },
});
