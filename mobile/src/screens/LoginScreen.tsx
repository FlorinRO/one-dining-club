import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import {
  ArrowLeft,
  LogIn,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authApi } from "../api/authApi";
import { useI18n } from "../i18n/useI18n";
import { useSocialAuth } from "../lib/socialAuth";
import { AuthStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const KEYBOARD_FORM_GAP = 5;

export function LoginScreen({ navigation }: Props) {
  const { tr } = useI18n();
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((state) => state.setSession);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);

  const [email, setEmail] = useState("demo@yumzy.ro");
  const [password, setPassword] = useState("password123");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState(email);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const focusedFieldRef = useRef<string | null>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateX = useRef(new Animated.Value(24)).current;

  const scrollAuthFormIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === "ios" ? 260 : 120);
  }, []);

  const focusAuthField = useCallback(
    (field: "email" | "password") => {
      focusedFieldRef.current = field;
      setFocusedField(field);
      if (keyboardHeight > 0) {
        scrollAuthFormIntoView();
      }
    },
    [keyboardHeight, scrollAuthFormIntoView],
  );

  const clearFocusedField = useCallback(() => {
    focusedFieldRef.current = null;
    setFocusedField(null);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      if (focusedFieldRef.current === "email" || focusedFieldRef.current === "password") {
        scrollAuthFormIntoView();
      }
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollAuthFormIntoView]);

  useFocusEffect(
    useCallback(() => {
      contentOpacity.setValue(0);
      contentTranslateX.setValue(24);
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateX, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, [contentOpacity, contentTranslateX]),
  );

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
  const keyboardScreenOffset = keyboardHeight > 0 ? -keyboardHeight : 0;
  const scrollBottomPadding = keyboardHeight > 0 ? keyboardHeight + KEYBOARD_FORM_GAP : insets.bottom + 24;

  const submit = async () => {
    if (!email || !password) {
      setError(tr("Completează emailul și parola.", "Fill in email and password."));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await authApi.login(email.trim(), password);
      setSession(session);
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError, tr));
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
      setForgotMessage(tr("Introdu emailul contului.", "Enter account email."));
      return;
    }

    setForgotLoading(true);
    setForgotMessage(null);
    try {
      await authApi.forgotPassword(forgotEmail.trim());
      setForgotMessage(
        tr(
          "Dacă există un cont activ, vei primi instrucțiuni de resetare.",
          "If an active account exists, you will receive reset instructions.",
        ),
      );
    } catch {
      setForgotMessage(tr("Nu am putut trimite cererea. Încearcă din nou.", "Could not send request. Try again."));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Pressable
        style={[styles.backButton, { top: insets.top + 10, transform: [{ translateY: keyboardScreenOffset }] }]}
        onPress={goToHome}
      >
        <ArrowLeft color={colors.white} size={24} strokeWidth={2.3} />
      </Pressable>

      <Animated.View
        style={[
          styles.overlayLayout,
          { opacity: contentOpacity, transform: [{ translateX: contentTranslateX }] },
        ]}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 72,
              paddingBottom: scrollBottomPadding,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerWrap}>
            <View style={styles.brandRow}>
              <View style={styles.logoWrap}>
                <Text style={styles.logoText}>
                  Yumz<Text style={styles.logoTextAccent}>Y</Text>
                </Text>
                <View style={styles.logoUnderlineRow}>
                  <View style={styles.logoUnderlineGreen} />
                  <View style={styles.logoUnderlineWhite} />
                </View>
              </View>
              <Text style={styles.headline}>Conectare</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.socialRow}>
              <SocialButton
                provider="google"
                loading={socialLoading === "google"}
                onPress={() => {
                  setError(null);
                  startSocialLogin("google");
                }}
              />

              <SocialButton
                provider="facebook"
                loading={socialLoading === "facebook"}
                onPress={() => {
                  setError(null);
                  startSocialLogin("facebook");
                }}
              />

              <SocialButton
                provider="apple"
                loading={false}
                onPress={() => {}}
              />
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{tr("sau cu email", "or with email")}</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.form}>
              <Pressable
                style={[styles.inputWrap, focusedField === "email" && styles.inputWrapFocused]}
                onPress={() => emailInputRef.current?.focus()}
              >
                <Mail color="#FFFFFF" size={20} strokeWidth={2.2} />
                <TextInput
                  ref={emailInputRef}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => focusAuthField("email")}
                  onBlur={clearFocusedField}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor="#CFCFD6"
                  style={styles.input}
                />
              </Pressable>

              <Pressable
                style={[styles.inputWrap, focusedField === "password" && styles.inputWrapFocused]}
                onPress={() => passwordInputRef.current?.focus()}
              >
                <LockKeyhole color="#FFFFFF" size={20} strokeWidth={2.2} />
                <TextInput
                  ref={passwordInputRef}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => focusAuthField("password")}
                  onBlur={clearFocusedField}
                  secureTextEntry={!showPassword}
                  placeholder={tr("Parolă", "Password")}
                  placeholderTextColor="#CFCFD6"
                  style={styles.input}
                />

                <Pressable onPress={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff color="#B0B0BC" size={20} /> : <Eye color="#B0B0BC" size={20} />}
                </Pressable>
              </Pressable>
            </View>

            <View style={styles.optionsRow}>
              <Pressable style={styles.rememberRow} onPress={() => setRememberMe((value) => !value)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <CheckCircle2 color="#101014" size={16} />}
                </View>
                <Text style={styles.optionText}>{tr("Ține-mă minte", "Remember me")}</Text>
              </Pressable>

              <Pressable onPress={openForgotPassword}>
                <Text style={styles.forgotText}>{tr("Ai uitat parola?", "Forgot password?")}</Text>
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
              accessibilityRole="button"
              accessibilityLabel={tr("Intră în cont", "Sign in")}
            >
              <LogIn color="#FFFFFF" size={18} strokeWidth={2.5} />
            </Pressable>

            <Pressable
              style={[styles.footerLink, keyboardHeight > 0 && styles.footerLinkKeyboardOpen]}
              onPress={() => navigation.replace("Register")}
            >
              <Text style={styles.footerText}>
                {tr("Nu ai cont?", "No account?")} <Text style={styles.footerAccent}>{tr("Creează unul", "Create one")}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>

      <Modal visible={forgotOpen} animationType="fade" transparent onRequestClose={() => setForgotOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.forgotCard}>
            <Text style={styles.forgotTitle}>{tr("Resetare parolă", "Password reset")}</Text>
            <Text style={styles.forgotSubtitle}>{tr("Primești un link pe email pentru setarea unei parole noi.", "You will receive an email link to set a new password.")}</Text>
            <View style={[styles.forgotInputWrap, focusedField === "forgotEmail" && styles.forgotInputWrapFocused]}>
              <Mail color={colors.red} size={20} strokeWidth={2.2} />
              <TextInput
                value={forgotEmail}
                onChangeText={setForgotEmail}
                onFocus={() => setFocusedField("forgotEmail")}
                onBlur={() => setFocusedField(null)}
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
                <Text style={styles.secondaryText}>{tr("Închide", "Close")}</Text>
              </Pressable>
              <Pressable
                disabled={forgotLoading}
                onPress={submitForgotPassword}
                style={[styles.forgotSubmitButton, forgotLoading && styles.disabled]}
              >
                <Text style={styles.forgotSubmitText}>{forgotLoading ? tr("Se trimite...", "Sending...") : tr("Trimite", "Send")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type SocialButtonProps = {
  provider: "google" | "facebook" | "apple";
  loading: boolean;
  onPress: () => void;
};

function SocialButton({ provider, loading, onPress }: SocialButtonProps) {
  const isApple = provider === "apple";
  const disabled = loading || isApple;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.socialButton, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      {provider === "google" ? (
        <GoogleGIcon size={28} />
      ) : provider === "facebook" ? (
        <FacebookIcon size={28} />
      ) : (
        <AppleIcon size={28} />
      )}
    </Pressable>
  );
}

function GoogleGIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.27-2.09 3.56-5.16 3.56-8.65Z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3A7.17 7.17 0 0 1 12 19.3a7.2 7.2 0 0 1-6.77-4.97H1.23v3.1A12 12 0 0 0 12 24Z"
      />
      <Path
        fill="#FBBC05"
        d="M5.23 14.33a7.2 7.2 0 0 1 0-4.66v-3.1H1.23a12 12 0 0 0 0 10.86l4-3.1Z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.8l3.43-3.43A11.53 11.53 0 0 0 12 0 12 12 0 0 0 1.23 6.57l4 3.1A7.2 7.2 0 0 1 12 4.77Z"
      />
    </Svg>
  );
}

function FacebookIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.23 2.68.23v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z"
      />
    </Svg>
  );
}

function AppleIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill="#FFFFFF"
        d="M16.37 1.54c.1 1.08-.3 2.15-1.03 2.94-.74.8-1.95 1.42-3.03 1.34-.12-1.04.34-2.16 1.02-2.9.77-.84 2.09-1.47 3.04-1.38Zm3.35 16.96c-.62 1.41-.92 2.04-1.72 3.29-1.12 1.72-2.7 3.86-4.66 3.88-1.74.02-2.19-1.13-4.55-1.12-2.36.01-2.86 1.15-4.6 1.13-1.96-.02-3.45-1.95-4.57-3.67-3.12-4.78-3.45-10.39-1.52-13.37 1.37-2.12 3.55-3.36 5.6-3.36 2.08 0 3.4 1.14 5.13 1.14 1.67 0 2.69-1.14 5.1-1.14 1.82 0 3.75 1 5.12 2.72-4.5 2.47-3.77 8.9.67 10.5Z"
        transform="scale(.82) translate(2.6 -.8)"
      />
    </Svg>
  );
}

function getLoginErrorMessage(error: unknown, tr: (ro: string, en: string) => string) {
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (typeof data === "string") {
    if (data.toLowerCase().includes("invalid") || data.toLowerCase().includes("credential")) {
      return tr("Emailul sau parola nu sunt corecte.", "Email or password is incorrect.");
    }
  }
  return tr("Emailul sau parola nu sunt corecte.", "Email or password is incorrect.");
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "transparent",
  },
  overlayLayout: {
    flex: 1,
    position: "relative",
    zIndex: 20,
    elevation: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: "flex-end",
    gap: 24,
  },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 30,
    elevation: 30,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  headerWrap: {
    gap: 14,
  },
  brandRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    transform: [{ translateY: -35 }],
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  logoWrap: {
    alignItems: "flex-start",
  },
  logoTextAccent: {
    color: "#67D48A",
  },
  logoUnderlineRow: {
    marginTop: -2,
    flexDirection: "row",
    alignItems: "center",
  },
  logoUnderlineGreen: {
    width: 124,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#67D48A",
  },
  logoUnderlineWhite: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    marginLeft: 0,
  },
  headline: {
    color: colors.white,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  headlineSub: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 320,
    fontWeight: "500",
  },
  formCard: {
    paddingHorizontal: 2,
    paddingVertical: 4,
    gap: 8,
  },
  socialRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(0,0,0,0.34)",
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  socialButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    marginBottom: 22,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.26)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  form: {
    gap: 16,
  },
  inputWrap: {
    minHeight: 50,
    borderRadius: 25,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.44)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  inputWrapFocused: {
    borderColor: "#BFECCF",
    backgroundColor: "rgba(191,236,207,0.18)",
  },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    fontWeight: "500",
    paddingVertical: 0,
  },
  optionsRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  checkboxActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  optionText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    fontWeight: "600",
  },
  forgotText: {
    color: "#BFECCF",
    fontSize: 13,
    fontWeight: "700",
  },
  error: {
    marginTop: 18,
    color: "#FFD3D3",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 24,
    width: 62,
    height: 50,
    alignSelf: "center",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.46)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  footerLink: {
    alignItems: "center",
    paddingTop: 24,
  },
  footerLinkKeyboardOpen: {
    paddingBottom: 14,
  },
  footerText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    fontWeight: "500",
  },
  footerAccent: {
    color: "#BFECCF",
    fontWeight: "800",
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
    backgroundColor: "rgba(0, 0, 0, 0.42)",
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
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F0F0F2",
  },
  forgotInputWrapFocused: {
    borderColor: colors.red,
    backgroundColor: colors.white,
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
