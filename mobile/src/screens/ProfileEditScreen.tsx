import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, InteractionManager, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authApi } from "../api/authApi";
import { Screen } from "../components/Screen";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { ProfileStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { colors } from "../theme/colors";
import {
  BURGER_BACKGROUND_IMAGE,
  FOOD_BACKGROUND_BLUR_RADIUS,
  FOOD_BACKGROUND_GRADIENT_COLORS,
  FOOD_BACKGROUND_GRADIENT_LOCATIONS,
  FOOD_BACKGROUND_IMAGE_OPACITY,
  FOOD_BACKGROUND_IMAGE_SCALE,
} from "../theme/foodBackground";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileEdit">;
const PROFILE_GREEN_DARK = "#16A34A";

export function ProfileEditScreen({ navigation, route }: Props) {
  const { tr } = useI18n();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const { field } = route.params;

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const promoCode = useCartStore((state) => state.promoCode);
  const setPromoCode = useCartStore((state) => state.setPromoCode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<"firstName" | "lastName" | "phone" | "email" | "promo" | null>(null);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const promoRef = useRef<TextInput>(null);
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();

  const title = useMemo(() => {
    if (field === "name") return tr("Actualizează numele", "Update name");
    if (field === "phone") return tr("Actualizează numărul de telefon", "Update phone number");
    if (field === "promo") return tr("Adaugă cod promo", "Add promo code");
    return tr("Actualizează emailul", "Update email");
  }, [field]);

  useEffect(() => {
    let focusTask: { cancel: () => void } | null = null;
    const unsubscribe = navigation.addListener("transitionEnd", () => {
      focusTask = InteractionManager.runAfterInteractions(() => {
        if (field === "name") {
          setFocusedInput("firstName");
          firstNameRef.current?.focus();
          return;
        }
        if (field === "phone") {
          setFocusedInput("phone");
          phoneRef.current?.focus();
          return;
        }
        if (field === "promo") {
          setFocusedInput("promo");
          promoRef.current?.focus();
          return;
        }
        setFocusedInput("email");
        emailRef.current?.focus();
      });
    });
    return () => {
      unsubscribe();
      focusTask?.cancel();
    };
  }, [field, navigation]);

  const save = async () => {
    if (!accessToken) return;

    if (field === "name") {
      if (!firstName.trim()) {
        setError(tr("Prenumele este obligatoriu.", "First name is required."));
        return;
      }
    }

    if (field === "email") {
      if (!email.trim() || !email.includes("@")) {
        setError(tr("Folosește o adresă de email validă.", "Use a valid email address."));
        return;
      }
    }
    if (field === "promo") {
      if (!promoCode.trim()) {
        setError(tr("Introdu un cod promo.", "Enter a promo code."));
        return;
      }
      setPromoCode(promoCode.trim().toUpperCase());
      Alert.alert(tr("Cod promo", "Promo code"), tr(`Codul ${promoCode.trim().toUpperCase()} a fost aplicat.`, `Code ${promoCode.trim().toUpperCase()} has been applied.`));
      navigation.goBack();
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const payload =
        field === "name"
          ? { first_name: firstName.trim(), last_name: lastName.trim() }
          : field === "phone"
            ? { phone: phone.trim() }
            : { email: email.trim() };

      const updatedUser = await authApi.updateMe(payload);
      setUser(updatedUser);
      navigation.goBack();
    } catch {
      Alert.alert(tr("Eroare", "Error"), tr("Nu am putut salva profilul. Încearcă din nou.", "Could not save profile. Try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false}>
      <View style={styles.screen}>
        <Image source={BURGER_BACKGROUND_IMAGE} style={[styles.backgroundImage, { top: -insets.top }]} resizeMode="cover" blurRadius={FOOD_BACKGROUND_BLUR_RADIUS} />
        <LinearGradient
          pointerEvents="none"
          colors={FOOD_BACKGROUND_GRADIENT_COLORS}
          locations={FOOD_BACKGROUND_GRADIENT_LOCATIONS}
          style={[StyleSheet.absoluteFillObject, { top: -insets.top }]}
        />
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
            onScroll={trackFloatingCartScrollDirection}
            scrollEventThrottle={16}
          >
          <View style={styles.headerRow}>
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={30} color={colors.text} strokeWidth={2.2} />
            </Pressable>
            <Pressable style={styles.topSaveButton} onPress={save} disabled={saving}>
              <Text style={[styles.topSaveText, saving && styles.saveTextDisabled]}>{saving ? tr("Se salvează...", "Saving...") : tr("Salvează", "Save")}</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>{title}</Text>

          {field === "name" ? (
            <>
              <Pressable
                style={[styles.inputCard, focusedInput !== "firstName" && styles.inputCardMuted, focusedInput === "firstName" && styles.inputCardFocused]}
                onPress={() => firstNameRef.current?.focus()}
              >
                <Text style={styles.inputLabel}>{tr("Prenume", "First name")}</Text>
                <TextInput
                  ref={firstNameRef}
                  value={firstName}
                  onChangeText={setFirstName}
                  style={styles.input}
                  placeholder={tr("Prenume", "First name")}
                  placeholderTextColor={colors.muted}
                  onFocus={() => setFocusedInput("firstName")}
                  onBlur={() => setFocusedInput(null)}
                />
              </Pressable>

              <Pressable
                style={[styles.inputCard, styles.inputCardMuted, focusedInput === "lastName" && styles.inputCardFocused]}
                onPress={() => {
                  setFocusedInput("lastName");
                  firstNameRef.current?.blur();
                  requestAnimationFrame(() => lastNameRef.current?.focus());
                }}
              >
                <Text style={styles.inputLabel}>{tr("Nume", "Last name")}</Text>
                <TextInput
                  ref={lastNameRef}
                  value={lastName}
                  onChangeText={setLastName}
                  style={styles.input}
                  placeholder={tr("Nume", "Last name")}
                  placeholderTextColor={colors.muted}
                  onFocus={() => setFocusedInput("lastName")}
                  onBlur={() => setFocusedInput(null)}
                />
              </Pressable>
            </>
          ) : field === "phone" ? (
            <Pressable style={[styles.inputCard, focusedInput === "phone" && styles.inputCardFocused]} onPress={() => phoneRef.current?.focus()}>
              <Text style={styles.inputLabel}>{tr("Număr de telefon", "Phone number")}</Text>
              <TextInput
                ref={phoneRef}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.input}
                placeholder={tr("Număr de telefon", "Phone number")}
                placeholderTextColor={colors.muted}
                onFocus={() => setFocusedInput("phone")}
                onBlur={() => setFocusedInput(null)}
              />
            </Pressable>
          ) : field === "promo" ? (
            <Pressable style={[styles.inputCard, focusedInput === "promo" && styles.inputCardFocused]} onPress={() => promoRef.current?.focus()}>
              <Text style={styles.inputLabel}>{tr("Cod promo", "Promo code")}</Text>
              <TextInput
                ref={promoRef}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
                style={styles.input}
                placeholder="Ex: ONE20"
                placeholderTextColor={colors.muted}
                onFocus={() => setFocusedInput("promo")}
                onBlur={() => setFocusedInput(null)}
              />
            </Pressable>
          ) : (
            <Pressable style={[styles.inputCard, focusedInput === "email" && styles.inputCardFocused]} onPress={() => emailRef.current?.focus()}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.muted}
                onFocus={() => setFocusedInput("email")}
                onBlur={() => setFocusedInput(null)}
              />
            </Pressable>
          )}

            {error && <Text style={styles.errorText}>{error}</Text>}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: FOOD_BACKGROUND_IMAGE_OPACITY,
    transform: [{ scale: FOOD_BACKGROUND_IMAGE_SCALE }],
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 22,
  },
  headerRow: {
    minHeight: 40,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  topSaveButton: {
    minHeight: 32,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  topSaveText: {
    color: PROFILE_GREEN_DARK,
    fontSize: 14,
    fontWeight: "500",
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: 24,
  },
  inputCard: {
    borderWidth: 1,
    borderColor: PROFILE_GREEN_DARK,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 14,
    backgroundColor: colors.background,
  },
  inputCardMuted: {
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.cardSoft,
  },
  inputCardFocused: {
    borderWidth: 1,
    borderColor: PROFILE_GREEN_DARK,
    backgroundColor: colors.background,
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "500",
    paddingVertical: 0,
    minHeight: 20,
  },
  errorText: {
    marginTop: 6,
    color: PROFILE_GREEN_DARK,
    fontSize: 14,
    fontWeight: "500",
  },
  saveTextDisabled: {
    opacity: 0.55,
  },
});
