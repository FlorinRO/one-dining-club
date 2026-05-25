import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, Phone, UserPlus, UserRound } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
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

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

type FieldKey = "firstName" | "lastName" | "email" | "phone" | "password";

const KEYBOARD_FORM_GAP = 5;

export function RegisterScreen({ navigation }: Props) {
  const { tr } = useI18n();
  const setSession = useAuthStore((state) => state.setSession);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const firstNameInputRef = useRef<TextInput>(null);
  const lastNameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const focusedFieldRef = useRef<FieldKey | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<FieldKey | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const scrollAuthFormIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === "ios" ? 260 : 120);
  }, []);

  const focusAuthField = useCallback(
    (field: FieldKey) => {
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
      if (focusedFieldRef.current) {
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

  const goToLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Login");
  };

  const submit = async () => {
    if (!firstName.trim() || !email.trim() || password.length < 8) {
      setError(
        tr(
          "Completează prenumele, emailul și o parolă de minimum 8 caractere.",
          "Fill in first name, email, and a password of at least 8 characters.",
        ),
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await authApi.register({
        email: email.trim(),
        phone: phone.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setPassword("");
      setVerificationEmail(result.email || email.trim());
      setResendMessage(
        tr(
          "Ți-am trimis un link de confirmare. Verifică Inbox și Spam.",
          "We sent you a confirmation link. Check Inbox and Spam.",
        ),
      );
    } catch {
      setError(
        tr(
          "Nu am putut crea contul. Verifică dacă emailul nu este deja folosit.",
          "Could not create account. Check if email is already in use.",
        ),
      );
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
      setResendMessage(tr("Am retrimis linkul de confirmare.", "We resent the confirmation link."));
    } catch {
      setResendMessage(tr("Nu am putut retrimite emailul. Încearcă din nou.", "Could not resend email. Try again."));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Pressable
        style={[styles.backButton, { top: insets.top + 10, transform: [{ translateY: keyboardScreenOffset }] }]}
        onPress={goToLogin}
        accessibilityRole="button"
        accessibilityLabel={tr("Înapoi la conectare", "Back to sign in")}
      >
        <ArrowLeft color={colors.white} size={24} strokeWidth={2.3} />
      </Pressable>

      <View style={styles.overlayLayout}>
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
              <Text style={styles.headline}>
                {verificationEmail ? tr("Confirmare", "Confirm") : tr("Înregistrare", "Register")}
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            {verificationEmail ? (
              <View style={styles.verificationBox}>
                <View style={styles.verificationIcon}>
                  <Mail color={colors.white} size={25} strokeWidth={2.3} />
                </View>
                <Text style={styles.verificationTitle}>{tr("Confirmă emailul", "Confirm email")}</Text>
                <Text style={styles.verificationSubtitle}>
                  {tr(
                    `Am creat contul pentru ${verificationEmail}. Deschide linkul primit pe email, apoi revino la autentificare.`,
                    `We created the account for ${verificationEmail}. Open the link received by email, then return to sign in.`,
                  )}
                </Text>
                {resendMessage && <Text style={styles.successMessage}>{resendMessage}</Text>}

                <Pressable
                  disabled={resendLoading}
                  onPress={resendVerification}
                  style={({ pressed }) => [
                    styles.secondaryWideButton,
                    pressed && !resendLoading && styles.pressed,
                    resendLoading && styles.disabled,
                  ]}
                >
                  <Text style={styles.secondaryWideText}>
                    {resendLoading ? tr("Se retrimite...", "Resending...") : tr("Retrimite emailul", "Resend email")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => navigation.navigate("Login")}
                  style={({ pressed }) => [styles.primaryWideButton, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryWideText}>
                    {tr("Am confirmat, intră în cont", "Confirmed, sign in")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
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
                  <View style={styles.nameRow}>
                    <Pressable
                      style={[styles.inputWrap, styles.nameInput, focusedField === "firstName" && styles.inputWrapFocused]}
                      onPress={() => firstNameInputRef.current?.focus()}
                    >
                      <UserRound color="#FFFFFF" size={19} strokeWidth={2.2} />
                      <TextInput
                        ref={firstNameInputRef}
                        value={firstName}
                        onChangeText={setFirstName}
                        onFocus={() => focusAuthField("firstName")}
                        onBlur={clearFocusedField}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => {
                          focusAuthField("lastName");
                          lastNameInputRef.current?.focus();
                        }}
                        placeholder={tr("Prenume", "First name")}
                        placeholderTextColor="#CFCFD6"
                        style={styles.input}
                      />
                    </Pressable>

                    <Pressable
                      style={[styles.inputWrap, styles.nameInput, focusedField === "lastName" && styles.inputWrapFocused]}
                      onPress={() => lastNameInputRef.current?.focus()}
                    >
                      <UserRound color="#FFFFFF" size={19} strokeWidth={2.2} />
                      <TextInput
                        ref={lastNameInputRef}
                        value={lastName}
                        onChangeText={setLastName}
                        onFocus={() => focusAuthField("lastName")}
                        onBlur={clearFocusedField}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => {
                          focusAuthField("email");
                          emailInputRef.current?.focus();
                        }}
                        placeholder={tr("Nume", "Last name")}
                        placeholderTextColor="#CFCFD6"
                        style={styles.input}
                      />
                    </Pressable>
                  </View>

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
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => {
                        focusAuthField("phone");
                        phoneInputRef.current?.focus();
                      }}
                      placeholder="Email"
                      placeholderTextColor="#CFCFD6"
                      style={styles.input}
                    />
                  </Pressable>

                  <Pressable
                    style={[styles.inputWrap, focusedField === "phone" && styles.inputWrapFocused]}
                    onPress={() => phoneInputRef.current?.focus()}
                  >
                    <Phone color="#FFFFFF" size={20} strokeWidth={2.2} />
                    <TextInput
                      ref={phoneInputRef}
                      value={phone}
                      onChangeText={setPhone}
                      onFocus={() => focusAuthField("phone")}
                      onBlur={clearFocusedField}
                      keyboardType="name-phone-pad"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => {
                        focusAuthField("password");
                        passwordInputRef.current?.focus();
                      }}
                      placeholder={tr("Telefon", "Phone")}
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
                      returnKeyType="done"
                      placeholder={tr("Parolă", "Password")}
                      placeholderTextColor="#CFCFD6"
                      style={styles.input}
                    />
                    <Pressable onPress={() => setShowPassword((value) => !value)}>
                      {showPassword ? <EyeOff color="#B0B0BC" size={20} /> : <Eye color="#B0B0BC" size={20} />}
                    </Pressable>
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
                  accessibilityLabel={tr("Creează cont", "Create account")}
                >
                  <UserPlus color="#FFFFFF" size={19} strokeWidth={2.5} />
                </Pressable>

                <Pressable
                  style={[styles.footerLink, keyboardHeight > 0 && styles.footerLinkKeyboardOpen]}
                  onPress={() => navigation.navigate("Login")}
                >
                  <Text style={styles.footerText}>
                    {tr("Ai deja cont?", "Already have an account?")}{" "}
                    <Text style={styles.footerAccent}>{tr("Intră în cont", "Sign in")}</Text>
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </View>
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
    gap: 20,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    transform: [{ translateY: -30 }],
  },
  brand: {
    color: "#000000",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0,
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    overflow: "hidden",
  },
  headline: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "600",
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
    marginBottom: 18,
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
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  form: {
    gap: 14,
  },
  nameRow: {
    flexDirection: "row",
    gap: 10,
  },
  nameInput: {
    flex: 1,
    paddingHorizontal: 12,
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
    textAlign: "center",
  },
  footerAccent: {
    color: "#BFECCF",
    fontWeight: "800",
  },
  verificationBox: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
  },
  verificationIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: "rgba(0,0,0,0.46)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.46)",
  },
  verificationTitle: {
    color: colors.white,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  verificationSubtitle: {
    marginTop: 12,
    color: "rgba(255,255,255,0.82)",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    textAlign: "center",
  },
  successMessage: {
    marginTop: 16,
    color: "#BFECCF",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
  },
  secondaryWideButton: {
    alignSelf: "stretch",
    marginTop: 22,
    minHeight: 50,
    borderRadius: 25,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.44)",
  },
  secondaryWideText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  primaryWideButton: {
    alignSelf: "stretch",
    marginTop: 12,
    minHeight: 50,
    borderRadius: 25,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.46)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
  },
  primaryWideText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.55,
  },
});
