import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  LogIn,
  Star,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  ScrollView,
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

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const setSession = useAuthStore((state) => state.setSession);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const [email, setEmail] = useState("demo@onedining.club");
  const [password, setPassword] = useState("password123");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState(email);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const sheetProgress = useRef(new Animated.Value(0)).current;

  const goToHome = () => {
    continueAsGuest();
  };

  const handleSocialSuccess = useCallback(
    (session: Awaited<ReturnType<typeof authApi.socialLogin>>) => setSession(session),
    [setSession],
  );

  const handleSocialError = useCallback((message: string) => setError(message), []);

  const { loadingProvider: socialLoading, startSocialLogin } = useSocialAuth({
    onSuccess: handleSocialSuccess,
    onError: handleSocialError,
  });

  const submit = async () => {
    if (!email || !password) {
      setError("Completează emailul și parola.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await authApi.login(email.trim(), password);
      setSession(session);
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotEmail(email);
    setForgotMessage(null);
    setForgotOpen(true);
  };

  const submitForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotMessage("Introdu emailul contului.");
      return;
    }

    setForgotLoading(true);
    setForgotMessage(null);
    try {
      await authApi.forgotPassword(forgotEmail.trim());
      setForgotMessage("Dacă există un cont activ, vei primi instrucțiuni de resetare.");
    } catch {
      setForgotMessage("Nu am putut trimite cererea. Încearcă din nou.");
    } finally {
      setForgotLoading(false);
    }
  };

  useEffect(() => {
    Animated.spring(sheetProgress, {
      toValue: sheetOpen ? 1 : 0,
      damping: 22,
      mass: 0.9,
      stiffness: 190,
      useNativeDriver: true,
    }).start();
  }, [sheetOpen, sheetProgress]);

  const sheetTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [620, 0],
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
      <View style={styles.screen}>
        <View style={styles.hero}>
          <Pressable style={styles.backButton} onPress={goToHome}>
            <ArrowLeft color={colors.white} size={24} strokeWidth={2.3} />
          </Pressable>

          <View style={styles.heroBrandRow}>
            <View style={styles.heroBrandTopRow}>
              <Text style={styles.heroBrand}>ONE DINING CLUB</Text>
              <View style={styles.brandStarWrap}>
                <Star color={colors.white} fill={colors.white} size={11} strokeWidth={2} />
              </View>
            </View>
          </View>
          <View style={styles.heroHeadlineWrap}>
            <View style={styles.heroHeadlineAccent} />
            <Text style={styles.heroHeadline}>
              Mâncarea ta preferată
              {"\n"}la un <Text style={styles.heroHeadlineHighlight}>login</Text> distanță
            </Text>
            <Text style={styles.heroHeadlineSub}>Rapid, simplu și gata de comandă în câteva secunde.</Text>
          </View>
          <View style={styles.heroBottomBrandBar}>
            <View style={styles.heroBottomBrandRow}>
              <Text style={styles.heroBottomBrandText}>ONE DINING CLUB</Text>
              <Star color={colors.red} fill={colors.red} size={11} strokeWidth={2} />
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

          <View style={styles.heroBubbleSmall} />

          <Pressable
            style={({ pressed }) => [styles.openSheetButton, pressed && styles.openSheetButtonPressed]}
            onPress={() => setSheetOpen(true)}
          >
            <View style={styles.openSheetIconBubble}>
              <LogIn color={colors.red} size={20} strokeWidth={2.4} />
            </View>
            <View style={styles.openSheetTextGroup}>
              <Text style={styles.openSheetLabel}>Continuă</Text>
              <Text style={styles.openSheetHint}>Deschide autentificarea</Text>
            </View>
            <ChevronDown color={colors.white} size={22} strokeWidth={2.6} />
          </Pressable>
        </View>

        {sheetOpen && <Pressable style={styles.overlay} onPress={() => setSheetOpen(false)} />}

        <Animated.View
          pointerEvents={sheetOpen ? "auto" : "none"}
          style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
        >
          <Pressable style={styles.sheetHandle} onPress={() => setSheetOpen(false)}>
            <View style={styles.handleBar} />
            <ChevronDown color={colors.red} size={22} strokeWidth={2.6} />
          </Pressable>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <View style={styles.card}>
              <Text style={styles.title}>Intră în cont</Text>
              <Text style={styles.subtitle}>Bine ai revenit. Alege metoda preferată pentru autentificare.</Text>

              <View style={styles.socialRow}>
                <SocialButton
                  label="G"
                  title="Google"
                  color="#FFFFFF"
                  textColor="#DB4437"
                  loading={socialLoading === "google"}
                  onPress={() => {
                    setError(null);
                    startSocialLogin("google");
                  }}
                />

                <SocialButton
                  label="f"
                  title="Facebook"
                  color="#1877F2"
                  textColor="#FFFFFF"
                  loading={socialLoading === "facebook"}
                  onPress={() => {
                    setError(null);
                    startSocialLogin("facebook");
                  }}
                />
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>sau cu email</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.form}>
                <View style={styles.inputWrap}>
                  <Mail color={colors.red} size={20} strokeWidth={2.2} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="Email"
                    placeholderTextColor="#A1A1AA"
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <LockKeyhole color={colors.red} size={20} strokeWidth={2.2} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Parolă"
                    placeholderTextColor="#A1A1AA"
                    style={styles.input}
                  />

                  <Pressable onPress={() => setShowPassword((value) => !value)}>
                    {showPassword ? <EyeOff color="#71717A" size={20} /> : <Eye color="#71717A" size={20} />}
                  </Pressable>
                </View>
              </View>

              <View style={styles.optionsRow}>
                <Pressable style={styles.rememberRow} onPress={() => setRememberMe((value) => !value)}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <CheckCircle2 color={colors.white} size={16} />}
                  </View>
                  <Text style={styles.optionText}>Ține-mă minte</Text>
                </Pressable>

                <Pressable onPress={openForgotPassword}>
                  <Text style={styles.forgotText}>Ai uitat parola?</Text>
                </Pressable>
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                disabled={loading}
                onPress={submit}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && !loading && styles.pressed,
                  loading && styles.disabled,
                ]}
              >
                <Text style={styles.primaryText}>{loading ? "Se conectează..." : "Intră în cont"}</Text>
              </Pressable>

              <Pressable style={styles.footerLink} onPress={() => navigation.navigate("Register")}>
                <Text style={styles.footerText}>
                  Nu ai cont? <Text style={styles.footerAccent}>Creează unul</Text>
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>

        <Modal visible={forgotOpen} animationType="fade" transparent onRequestClose={() => setForgotOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.forgotCard}>
              <Text style={styles.forgotTitle}>Resetare parolă</Text>
              <Text style={styles.forgotSubtitle}>Primești un link pe email pentru setarea unei parole noi.</Text>
              <View style={styles.forgotInputWrap}>
                <Mail color={colors.red} size={20} strokeWidth={2.2} />
                <TextInput
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor="#A1A1AA"
                  style={styles.input}
                />
              </View>
              {forgotMessage && <Text style={styles.forgotMessage}>{forgotMessage}</Text>}
              <View style={styles.forgotActions}>
                <Pressable onPress={() => setForgotOpen(false)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Închide</Text>
                </Pressable>
                <Pressable
                  disabled={forgotLoading}
                  onPress={submitForgotPassword}
                  style={[styles.forgotSubmitButton, forgotLoading && styles.disabled]}
                >
                  <Text style={styles.forgotSubmitText}>{forgotLoading ? "Se trimite..." : "Trimite"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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

function getLoginErrorMessage(error: unknown) {
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return "Emailul sau parola nu sunt corecte.";
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: colors.white,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  hero: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    overflow: "hidden",
    backgroundColor: colors.white,
  },
  backButton: {
    position: "absolute",
    top: 56,
    left: 24,
    zIndex: 40,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red,
  },
  heroBrandRow: {
    position: "absolute",
    top: 136,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingVertical: 6,
    backgroundColor: colors.red,
  },
  heroBrandTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroBrand: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  brandStarWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroHeadlineWrap: {
    position: "absolute",
    top: 178,
    left: 24,
    right: 24,
    zIndex: 12,
    paddingLeft: 14,
  },
  heroHeadlineAccent: {
    position: "absolute",
    left: 0,
    top: 4,
    bottom: 10,
    width: 5,
    borderRadius: 999,
    backgroundColor: colors.red,
  },
  heroHeadline: {
    color: "#121212",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -0.7,
    maxWidth: 330,
  },
  heroHeadlineHighlight: {
    color: colors.red,
  },
  heroHeadlineSub: {
    marginTop: 8,
    color: "#52525B",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    maxWidth: 300,
  },
  heroBottomBrandBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 350,
    paddingHorizontal: 22,
    paddingVertical: 6,
    backgroundColor: colors.red,
  },
  heroBottomBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroBottomBrandText: {
    color: colors.red,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heroTitle: {
    marginTop: 10,
    maxWidth: 310,
    alignSelf: "center",
    textAlign: "center",
    color: "#18181B",
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "700",
  },
  heroSubtitle: {
    marginTop: 12,
    maxWidth: 310,
    alignSelf: "center",
    textAlign: "center",
    color: "#71717A",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "400",
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
  lottieAnimation: {
    width: 430,
    height: 430,
  },
  heroBubbleSmall: {
    position: "absolute",
    left: 38,
    bottom: 118,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFE1E1",
  },
  openSheetButton: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 38,
    minHeight: 68,
    borderRadius: 28,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.red,
    shadowColor: "#B91C1C",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  openSheetButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  openSheetIconBubble: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  openSheetTextGroup: {
    flex: 1,
    paddingHorizontal: 14,
  },
  openSheetLabel: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  openSheetHint: {
    marginTop: 2,
    color: "#FFE1E1",
    fontSize: 13,
    fontWeight: "500",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(24, 24, 27, 0.34)",
  },

  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "74%",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    backgroundColor: colors.white,
    shadowColor: "#18181B",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 14,
  },
  sheetHandle: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  handleBar: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#FFE1E1",
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 34,
  },
  card: {
    backgroundColor: colors.white,
  },
  title: {
    color: "#121212",
    fontSize: 31,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 8,
    color: "#71717A",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "400",
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
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
  socialIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  socialLetter: {
    fontSize: 16,
    fontWeight: "700",
  },
  socialText: {
    color: "#202124",
    fontSize: 15,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#EFEFF1",
  },
  dividerText: {
    color: "#A1A1AA",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  form: {
    gap: 12,
  },
  inputWrap: {
    minHeight: 60,
    borderRadius: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F0F0F2",
  },
  input: {
    flex: 1,
    color: "#18181B",
    fontSize: 16,
    fontWeight: "400",
  },
  optionsRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  optionText: {
    color: "#3F3F46",
    fontSize: 14,
    fontWeight: "500",
  },
  forgotText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    marginTop: 16,
    color: colors.redDark,
    fontSize: 14,
    fontWeight: "500",
  },
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
  primaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  footerLink: {
    alignItems: "center",
    paddingTop: 20,
  },
  footerText: {
    color: "#71717A",
    fontSize: 16,
    fontWeight: "400",
  },
  footerAccent: {
    color: colors.red,
    fontWeight: "700",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  modalBackdrop: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.38)",
  },
  forgotCard: {
    width: "100%",
    borderRadius: 24,
    padding: 20,
    backgroundColor: colors.white,
    gap: 14,
  },
  forgotTitle: {
    color: "#121212",
    fontSize: 22,
    fontWeight: "800",
  },
  forgotSubtitle: {
    color: "#71717A",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  forgotInputWrap: {
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F0F0F2",
  },
  forgotMessage: {
    color: "#3F3F46",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  forgotActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F5",
  },
  secondaryText: {
    color: "#3F3F46",
    fontWeight: "800",
  },
  forgotSubmitButton: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red,
  },
  forgotSubmitText: {
    color: colors.white,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.55,
  },
});
