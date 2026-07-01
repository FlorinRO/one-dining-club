import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CheckCircle2, Eye, EyeOff, LockKeyhole, LogIn, Mail } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { getErrorMessage } from "../lib/errors";
import { AuthStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;
type FieldKey = "email" | "password" | "forgotEmail";

const KEYBOARD_FORM_GAP = 5;

export function LoginScreen({}: Props) {
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((state) => state.setSession);
  const logout = useAuthStore((state) => state.logout);
  const scrollRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const focusedFieldRef = useRef<FieldKey | null>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateX = useRef(new Animated.Value(24)).current;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<FieldKey | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  useEffect(() => {
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
  }, [contentOpacity, contentTranslateX]);

  const scrollAuthFormIntoView = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === "ios" ? 260 : 120);
  };

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
  }, []);

  const focusAuthField = (field: "email" | "password") => {
    focusedFieldRef.current = field;
    setFocusedField(field);
    if (keyboardHeight > 0) {
      scrollAuthFormIntoView();
    }
  };

  const clearFocusedField = () => {
    focusedFieldRef.current = null;
    setFocusedField(null);
  };

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await authApi.login(email.trim(), password);
      if (session.user.role !== "courier") {
        logout();
        setError("This account does not have courier access.");
        return;
      }
      setSession(session);
    } catch (submitError) {
      setError(getLoginErrorMessage(submitError));
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
      setForgotMessage("Enter the email address for your courier account.");
      return;
    }

    setForgotLoading(true);
    setForgotMessage(null);
    try {
      await authApi.forgotPassword(forgotEmail.trim(), "courier");
      setForgotMessage("If an active courier account exists, reset instructions will be sent.");
    } catch (forgotError) {
      setForgotMessage(getErrorMessage(forgotError, "Could not send request. Try again."));
    } finally {
      setForgotLoading(false);
    }
  };

  const scrollBottomPadding = keyboardHeight > 0 ? keyboardHeight + KEYBOARD_FORM_GAP : insets.bottom + 24;
  const isForgotKeyboardActive = forgotOpen && focusedField === "forgotEmail" && keyboardHeight > 0;
  const forgotCardShift = isForgotKeyboardActive ? -Math.min(keyboardHeight * 0.32, 96) : 0;

  return (
    <View style={styles.screen}>
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
              <Text style={styles.headline}>Courier Sign In</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>courier access</Text>
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
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
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
                  placeholder="Password"
                  placeholderTextColor="#CFCFD6"
                  style={styles.input}
                  returnKeyType="go"
                  onSubmitEditing={submit}
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
                <Text style={styles.optionText}>Remember me</Text>
              </Pressable>

              <Pressable onPress={openForgotPassword}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              disabled={loading}
              onPress={submit}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !loading && styles.pressed,
                loading && styles.disabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <LogIn color="#FFFFFF" size={18} strokeWidth={2.5} />}
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>

      <Modal visible={forgotOpen} animationType="fade" transparent onRequestClose={() => setForgotOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss}>
          <Pressable style={[styles.forgotCard, { transform: [{ translateY: forgotCardShift }] }]} onPress={() => {}}>
            <View style={styles.forgotHeader}>
              <Text style={styles.forgotEyebrow}>Account access</Text>
              <Text style={styles.forgotTitle}>Password reset</Text>
              <Text style={styles.forgotSubtitle}>
                You will receive an email link to set a new password for your courier account.
              </Text>
            </View>
            <View style={[styles.forgotInputWrap, focusedField === "forgotEmail" && styles.forgotInputWrapFocused]}>
              <Mail color="#FFFFFF" size={20} strokeWidth={2.2} />
              <TextInput
                value={forgotEmail}
                onChangeText={setForgotEmail}
                onFocus={() => setFocusedField("forgotEmail")}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor="#CFCFD6"
                style={styles.input}
              />
            </View>
            {forgotMessage ? (
              <Text
                style={[
                  styles.forgotMessage,
                  forgotMessage.includes("If an active courier account exists")
                    ? styles.forgotMessageSuccess
                    : styles.forgotMessageError,
                ]}
              >
                {forgotMessage}
              </Text>
            ) : null}
            <View style={styles.forgotActions}>
              <Pressable onPress={() => setForgotOpen(false)} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Close</Text>
              </Pressable>
              <Pressable
                disabled={forgotLoading}
                onPress={submitForgotPassword}
                style={[styles.forgotSubmitButton, forgotLoading && styles.disabled]}
              >
                <Text style={styles.forgotSubmitText}>{forgotLoading ? "Sending..." : "Send"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getLoginErrorMessage(error: unknown) {
  const message = getErrorMessage(error, "Email or password is incorrect.");
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid") || normalized.includes("credential")) {
    return "Email or password is incorrect.";
  }
  return message;
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
  headerWrap: {
    gap: 14,
  },
  brandRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    transform: [{ translateY: -35 }],
  },
  logoWrap: {
    alignItems: "flex-start",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
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
  },
  headline: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  formCard: {
    paddingHorizontal: 2,
    paddingVertical: 4,
    gap: 8,
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
    color: "#FFFFFF",
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
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  modalBackdrop: {
    flex: 1,
    width: "100%",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3, 6, 10, 0.58)",
    paddingTop: 64,
  },
  forgotCard: {
    width: "100%",
    borderRadius: 24,
    padding: 20,
    gap: 16,
    backgroundColor: "rgba(8, 12, 18, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
  forgotHeader: {
    gap: 8,
  },
  forgotEyebrow: {
    color: "rgba(191,236,207,0.86)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  forgotTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  forgotSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  forgotInputWrap: {
    minHeight: 50,
    borderRadius: 25,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.44)",
  },
  forgotInputWrapFocused: {
    borderColor: "#BFECCF",
    backgroundColor: "rgba(191,236,207,0.18)",
  },
  forgotMessage: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  forgotMessageSuccess: {
    color: "#CFF6D9",
  },
  forgotMessageError: {
    color: "#FFD3D3",
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
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  secondaryText: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  forgotSubmitButton: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.46)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
  },
  forgotSubmitText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.55,
  },
});
