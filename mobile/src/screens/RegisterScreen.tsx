import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Eye, EyeOff, LockKeyhole, Mail, Phone, Star, UserRound } from "lucide-react-native";
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
import { useSocialAuth } from "../lib/socialAuth";
import { AuthStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

type FieldKey = "firstName" | "lastName" | "email" | "phone" | "password";

export function RegisterScreen({ navigation }: Props) {
  const setSession = useAuthStore((state) => state.setSession);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const firstNameInputRef = useRef<TextInput>(null);
  const lastNameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const fieldY = useRef<Record<FieldKey, number>>({
    firstName: 0,
    lastName: 0,
    email: 0,
    phone: 0,
    password: 0,
  });

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

  const handleSocialSuccess = useCallback(
    (session: Awaited<ReturnType<typeof authApi.socialLogin>>) => setSession(session),
    [setSession],
  );
  const handleSocialError = useCallback((message: string) => setError(message), []);

  const { loadingProvider: socialLoading, startSocialLogin } = useSocialAuth({
    onSuccess: handleSocialSuccess,
    onError: handleSocialError,
  });

  const scrollToField = (field: FieldKey) => {
    setFocusedField(field);
    requestAnimationFrame(() => {
      const extraOffset = field === "password" ? 340 : field === "phone" ? 300 : 150;
      const y = Math.max(0, fieldY.current[field] - extraOffset);
      scrollRef.current?.scrollTo({ y, animated: true });
    });
  };

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + keyboardHeight + 24 }]}
      >
        <View style={styles.brandBar}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>ONE DINING CLUB</Text>
            <Star color={colors.white} fill={colors.white} size={11} strokeWidth={2} />
          </View>
        </View>

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
            <Pressable
              disabled={resendLoading}
              onPress={resendVerification}
              style={({ pressed }) => [
                styles.secondaryWideButton,
                pressed && !resendLoading && styles.pressed,
                resendLoading && styles.disabled,
              ]}
            >
              <Text style={styles.secondaryWideText}>{resendLoading ? "Se retrimite..." : "Retrimite emailul"}</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("Login")} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Am confirmat, intră în cont</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Creează cont</Text>
            <Text style={styles.subtitle}>
              Salvăm adresele, comenzile și restaurantele preferate după confirmarea emailului.
            </Text>

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
              <View style={styles.nameRow}>
                <View
                  style={[styles.inputWrap, styles.nameInput, focusedField === "firstName" && styles.inputWrapFocused]}
                  onLayout={(event) => {
                    fieldY.current.firstName = event.nativeEvent.layout.y;
                  }}
                >
                  <UserRound color={colors.muted} size={19} />
                  <TextInput
                    ref={firstNameInputRef}
                    value={firstName}
                    onChangeText={setFirstName}
                    onFocus={() => scrollToField("firstName")}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => {
                      scrollToField("lastName");
                      lastNameInputRef.current?.focus();
                    }}
                    placeholder="Prenume"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </View>
                <View
                  style={[styles.inputWrap, styles.nameInput, focusedField === "lastName" && styles.inputWrapFocused]}
                  onLayout={(event) => {
                    fieldY.current.lastName = event.nativeEvent.layout.y;
                  }}
                >
                  <UserRound color={colors.muted} size={19} />
                  <TextInput
                    ref={lastNameInputRef}
                    value={lastName}
                    onChangeText={setLastName}
                    onFocus={() => scrollToField("lastName")}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => {
                      scrollToField("email");
                      emailInputRef.current?.focus();
                    }}
                    placeholder="Nume"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </View>
              </View>
              <View
                style={[styles.inputWrap, focusedField === "email" && styles.inputWrapFocused]}
                onLayout={(event) => {
                  fieldY.current.email = event.nativeEvent.layout.y;
                }}
              >
                <Mail color={colors.muted} size={20} />
                <TextInput
                  ref={emailInputRef}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => scrollToField("email")}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    phoneInputRef.current?.focus();
                  }}
                  placeholder="Email"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </View>
              <View
                style={[styles.inputWrap, focusedField === "phone" && styles.inputWrapFocused]}
                onLayout={(event) => {
                  fieldY.current.phone = event.nativeEvent.layout.y;
                }}
              >
                <Phone color={colors.muted} size={20} />
                <TextInput
                  ref={phoneInputRef}
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => {
                    scrollToField("phone");
                    requestAnimationFrame(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    });
                  }}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="name-phone-pad"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    scrollToField("password");
                    passwordInputRef.current?.focus();
                  }}
                  placeholder="Telefon"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </View>
              <View
                style={[styles.inputWrap, focusedField === "password" && styles.inputWrapFocused]}
                onLayout={(event) => {
                  fieldY.current.password = event.nativeEvent.layout.y;
                }}
              >
                <LockKeyhole color={colors.muted} size={20} />
                <TextInput
                  ref={passwordInputRef}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => {
                      scrollToField("password");
                      requestAnimationFrame(() => {
                        scrollRef.current?.scrollToEnd({ animated: true });
                      });
                    }}
                    onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  placeholder="Parolă"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
                <Pressable onPress={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff color={colors.muted} size={20} /> : <Eye color={colors.muted} size={20} />}
                </Pressable>
              </View>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              disabled={loading}
              onPress={submit}
              style={({ pressed }) => [styles.primaryButton, pressed && !loading && styles.pressed, loading && styles.disabled]}
            >
              <Text style={styles.primaryText}>{loading ? "Se creează..." : "Creează cont"}</Text>
            </Pressable>

            <Pressable style={styles.footerLink} onPress={() => navigation.navigate("Login")}>
              <Text style={styles.footerText}>
                Ai deja cont? <Text style={styles.footerAccent}>Intră în cont</Text>
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
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
  content: { paddingHorizontal: 24, paddingTop: 76 },
  brandBar: {
    marginHorizontal: -24,
    backgroundColor: colors.red,
    paddingHorizontal: 22,
    paddingVertical: 6,
    marginBottom: 34,
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
  subtitle: { marginTop: 12, color: "#71717A", fontSize: 16, lineHeight: 23, fontWeight: "400" },
  successMessage: { marginTop: 16, color: colors.redDark, fontSize: 14, lineHeight: 20, fontWeight: "500", textAlign: "center" },
  socialRow: { flexDirection: "row", gap: 12, marginTop: 30 },
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
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 28 },
  divider: { flex: 1, height: 1, backgroundColor: "#EFEFF1" },
  dividerText: { color: "#A1A1AA", fontSize: 13, fontWeight: "600", textTransform: "uppercase" },
  form: { gap: 14, marginTop: 2 },
  nameRow: { flexDirection: "row", gap: 10 },
  nameInput: { flex: 1, paddingHorizontal: 12 },
  inputWrap: {
    minHeight: 54,
    borderRadius: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F0F0F2",
  },
  inputWrapFocused: { borderColor: colors.red, backgroundColor: colors.white },
  input: { flex: 1, color: "#18181B", fontSize: 16, fontWeight: "400" },
  error: { marginTop: 16, color: colors.redDark, fontSize: 14, fontWeight: "500" },
  primaryButton: {
    alignSelf: "center",
    marginTop: 28,
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
  footerLink: { alignItems: "center", paddingTop: 26 },
  footerText: { color: "#71717A", fontSize: 16, fontWeight: "400" },
  footerAccent: { color: colors.red, fontWeight: "700" },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  disabled: { opacity: 0.55 },
});
