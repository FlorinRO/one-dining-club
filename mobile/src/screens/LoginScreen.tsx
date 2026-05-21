import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import {
  ArrowLeft,
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
  KeyboardAvoidingView,
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

const LOGIN_BACKGROUND_VIDEOS: VideoSource[] = [
  { uri: "https://assets.mixkit.co/videos/12171/12171-1080.mp4", contentType: "progressive", useCaching: false },
  { uri: "https://assets.mixkit.co/videos/2433/2433-1080.mp4", contentType: "progressive", useCaching: false },
  { uri: "https://assets.mixkit.co/videos/51238/51238-1080.mp4", contentType: "progressive", useCaching: false },
  { uri: "https://assets.mixkit.co/videos/51236/51236-1080.mp4", contentType: "progressive", useCaching: false },
  { uri: "https://assets.mixkit.co/videos/41350/41350-1080.mp4", contentType: "progressive", useCaching: false },
  { uri: "https://assets.mixkit.co/videos/40830/40830-1080.mp4", contentType: "progressive", useCaching: false },
  { uri: "https://assets.mixkit.co/videos/372/372-720.mp4", contentType: "progressive", useCaching: false },
];
const VIDEO_MAX_VISIBLE_DURATION_MS = 4000;
const VIDEO_CROSSFADE_DURATION_MS = 1000;
const VIDEO_TRANSITION_START_DELAY_MS = VIDEO_MAX_VISIBLE_DURATION_MS - VIDEO_CROSSFADE_DURATION_MS;
const VIDEO_POST_SWAP_HOLD_MS = 120;

export function LoginScreen({ navigation }: Props) {
  const { tr } = useI18n();
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((state) => state.setSession);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);

  const [email, setEmail] = useState("demo@onedining.club");
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
  const [slotAIndex, setSlotAIndex] = useState(0);
  const [slotBIndex, setSlotBIndex] = useState(1);
  const [visibleSlot, setVisibleSlot] = useState<"A" | "B">("A");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slotAReady, setSlotAReady] = useState(false);
  const [slotBReady, setSlotBReady] = useState(false);
  const [nextQueueIndex, setNextQueueIndex] = useState(2 % LOGIN_BACKGROUND_VIDEOS.length);
  const layerBOpacity = useRef(new Animated.Value(0)).current;
  const visibleSlotRef = useRef<"A" | "B">("A");
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    visibleSlotRef.current = visibleSlot;
  }, [visibleSlot]);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  const slotAVideoSource = LOGIN_BACKGROUND_VIDEOS[slotAIndex];
  const slotBVideoSource = LOGIN_BACKGROUND_VIDEOS[slotBIndex];

  const slotAPlayer = useVideoPlayer(slotAVideoSource, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });
  const slotBPlayer = useVideoPlayer(slotBVideoSource, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });

  useEffect(() => {
    slotAPlayer.loop = true;
    slotAPlayer.muted = true;
    slotAPlayer.currentTime = 0;
    slotAPlayer.play();
  }, [slotAPlayer, slotAIndex]);

  useEffect(() => {
    slotBPlayer.loop = true;
    slotBPlayer.muted = true;
    slotBPlayer.currentTime = 0;
    slotBPlayer.play();
  }, [slotBPlayer, slotBIndex]);

  useEffect(() => {
    if (isTransitioning) return undefined;

    const transitionTimer = setTimeout(() => {
      if (isTransitioningRef.current) return;
      const currentVisible = visibleSlotRef.current;
      const hiddenReady = currentVisible === "A" ? slotBReady : slotAReady;
      if (!hiddenReady) return;

      isTransitioningRef.current = true;
      setIsTransitioning(true);
      const targetOpacity = currentVisible === "A" ? 1 : 0;
      Animated.timing(layerBOpacity, {
        toValue: targetOpacity,
        duration: VIDEO_CROSSFADE_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          isTransitioningRef.current = false;
          setIsTransitioning(false);
          return;
        }

        const nowVisible = currentVisible === "A" ? "B" : "A";
        setVisibleSlot(nowVisible);

        setTimeout(() => {
          if (nowVisible === "A") {
            setSlotBReady(false);
            setSlotBIndex(nextQueueIndex);
          } else {
            setSlotAReady(false);
            setSlotAIndex(nextQueueIndex);
          }
          setNextQueueIndex((current) => (current + 1) % LOGIN_BACKGROUND_VIDEOS.length);
          isTransitioningRef.current = false;
          setIsTransitioning(false);
        }, VIDEO_POST_SWAP_HOLD_MS);
      });
    }, VIDEO_TRANSITION_START_DELAY_MS);

    return () => clearTimeout(transitionTimer);
  }, [isTransitioning, layerBOpacity, nextQueueIndex, slotAReady, slotBReady]);

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
      <VideoView
        player={slotAPlayer}
        style={styles.videoBackground}
        contentFit="cover"
        surfaceType="textureView"
        nativeControls={false}
        playsInline
        allowsPictureInPicture={false}
        onFirstFrameRender={() => setSlotAReady(true)}
        pointerEvents="none"
      />
      <Animated.View style={[styles.videoBackground, styles.crossfadeLayer, { opacity: layerBOpacity }]}>
        <VideoView
          player={slotBPlayer}
          style={styles.videoBackground}
          contentFit="cover"
          surfaceType="textureView"
          nativeControls={false}
          playsInline
          allowsPictureInPicture={false}
          onFirstFrameRender={() => setSlotBReady(true)}
          pointerEvents="none"
        />
      </Animated.View>

      <View pointerEvents="none" style={styles.videoBlurMask} />
      <View pointerEvents="none" style={styles.videoGlassTint} />

      <Pressable style={[styles.backButton, { top: insets.top + 10 }]} onPress={goToHome}>
        <ArrowLeft color={colors.white} size={24} strokeWidth={2.3} />
      </Pressable>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 24}
        style={styles.overlayLayout}
      >
        <ScrollView
          keyboardShouldPersistTaps="always"
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerWrap}>
            <Text style={styles.brand}>ONE DINING CLUB</Text>
            <Text style={styles.headline}>{tr("Intră în cont", "Sign in")}</Text>
            <Text style={styles.headlineSub}>
              {tr(
                "Fundalul e dinamic, comanda rămâne simplă. Te autentifici în câteva secunde.",
                "Dynamic background, simple ordering. Sign in in a few seconds.",
              )}
            </Text>
          </View>

          <View style={styles.formCard}>
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
              <Text style={styles.dividerText}>{tr("sau cu email", "or with email")}</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.form}>
              <View style={[styles.inputWrap, focusedField === "email" && styles.inputWrapFocused]}>
                <Mail color={colors.red} size={20} strokeWidth={2.2} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor="#CFCFD6"
                  style={styles.input}
                />
              </View>

              <View style={[styles.inputWrap, focusedField === "password" && styles.inputWrapFocused]}>
                <LockKeyhole color={colors.red} size={20} strokeWidth={2.2} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  placeholder={tr("Parolă", "Password")}
                  placeholderTextColor="#CFCFD6"
                  style={styles.input}
                />

                <Pressable onPress={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff color="#B0B0BC" size={20} /> : <Eye color="#B0B0BC" size={20} />}
                </Pressable>
              </View>
            </View>

            <View style={styles.optionsRow}>
              <Pressable style={styles.rememberRow} onPress={() => setRememberMe((value) => !value)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <CheckCircle2 color={colors.white} size={16} />}
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
            >
              <Text style={styles.primaryText}>{loading ? tr("Se conectează...", "Signing in...") : tr("Intră în cont", "Sign in")}</Text>
            </Pressable>

            <Pressable style={styles.footerLink} onPress={() => navigation.navigate("Register")}>
              <Text style={styles.footerText}>
                {tr("Nu ai cont?", "No account?")} <Text style={styles.footerAccent}>{tr("Creează unul", "Create one")}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
      <Text style={styles.socialText}>{loading ? "Opening..." : title}</Text>
    </Pressable>
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
    backgroundColor: "#0F0E12",
  },
  videoBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    elevation: 0,
  },
  crossfadeLayer: {
    zIndex: 1,
    elevation: 1,
  },
  videoBlurMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 8, 12, 0.40)",
    zIndex: 2,
    elevation: 2,
  },
  videoGlassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    zIndex: 3,
    elevation: 3,
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
    gap: 16,
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
    gap: 10,
  },
  brand: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  headline: {
    color: colors.white,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  headlineSub: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 320,
    fontWeight: "500",
  },
  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.38)",
    backgroundColor: "rgba(20, 20, 28, 0.58)",
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 9,
  },
  socialRow: {
    flexDirection: "row",
    gap: 10,
  },
  socialButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.86)",
  },
  socialIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  socialLetter: {
    fontSize: 16,
    fontWeight: "700",
  },
  socialText: {
    color: "#1F1F25",
    fontSize: 14,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  form: {
    gap: 10,
  },
  inputWrap: {
    minHeight: 56,
    borderRadius: 17,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  inputWrapFocused: {
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    fontWeight: "500",
  },
  optionsRow: {
    marginTop: 14,
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
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  checkboxActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  optionText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "600",
  },
  forgotText: {
    color: "#FFD7D7",
    fontSize: 13,
    fontWeight: "700",
  },
  error: {
    marginTop: 14,
    color: "#FFD3D3",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 16,
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red,
  },
  primaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  footerLink: {
    alignItems: "center",
    paddingTop: 16,
  },
  footerText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 15,
    fontWeight: "500",
  },
  footerAccent: {
    color: "#FFD1D1",
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
