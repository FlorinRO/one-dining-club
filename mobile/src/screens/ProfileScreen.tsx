import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Check,
  ChevronRight,
  CreditCard,
  Hand,
  Info,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Settings,
  Tag,
  UserRound,
  Wallet,
  X,
} from "lucide-react-native";
import { ReactElement, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authApi } from "../api/authApi";
import { FoodBackground } from "../components/FoodBackground";
import { Screen } from "../components/Screen";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { ProfileStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { usePaymentPreferencesStore } from "../store/paymentPreferencesStore";
import { showAppAlert } from "../store/uiStore";
import { colors } from "../theme/colors";
import { PaymentMethod } from "../types/models";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;
const PROFILE_GREEN = "#22C55E";
const PROFILE_GREEN_DARK = "#16A34A";

type AccountRowProps = {
  icon: ReactElement;
  children: ReactElement | string;
  action?: string;
  showCheck?: boolean;
  onPress?: () => void;
};

type OtherRowProps = {
  title: string;
  icon: ReactElement;
  onPress?: () => void;
  accent?: boolean;
};

export function ProfileScreen({ navigation }: Props) {
  const { t, tr } = useI18n();
  const insets = useSafeAreaInsets();
  const profileBackgroundImage = require("../../assets/food-src/burger-BG.jpg");
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isGuest = useAuthStore((state) => state.isGuest);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const preferredPaymentMethod = usePaymentPreferencesStore((state) => state.preferredPaymentMethod);
  const setPreferredPaymentMethod = usePaymentPreferencesStore((state) => state.setPreferredPaymentMethod);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPaymentMenuOpen, setIsPaymentMenuOpen] = useState(false);
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();

  const displayName = useMemo(
    () => user?.full_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || (isGuest ? tr("Oaspete", "Guest") : tr("Client", "Customer")),
    [isGuest, user?.first_name, user?.full_name, user?.last_name],
  );
  const greetingName = useMemo(() => firstWord(displayName) || firstWord(user?.email?.split("@")[0]) || tr("Client", "Customer"), [displayName, tr, user?.email]);
  const paymentTitle = paymentMethodLabel(preferredPaymentMethod, tr);
  const paymentHint = tr("Metodă standard", "Default method");
  const paymentMethods = useMemo(() => availablePaymentMethods(), []);
  const accountBalance = 0;

  const loadAccount = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (isGuest || !accessToken) {
        setLoadError(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadError(null);

      try {
        const profile = await authApi.me();
        setUser(profile);
      } catch {
        setLoadError(tr("Nu am putut sincroniza profilul. Trage în jos pentru reîncărcare.", "Could not sync your profile. Pull down to refresh."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, isGuest, setUser],
  );

  useFocusEffect(
    useCallback(() => {
      loadAccount();
    }, [loadAccount]),
  );

  const openOrders = useCallback(() => {
    navigation.getParent()?.navigate("OrdersTab", { screen: "OrdersHome" });
  }, [navigation]);

  const openPaymentMenu = useCallback(() => {
    setIsPaymentMenuOpen(true);
  }, []);

  const selectPaymentMethod = useCallback(
    (method: PaymentMethod) => {
      setPreferredPaymentMethod(method);
      setIsPaymentMenuOpen(false);
    },
    [setPreferredPaymentMethod],
  );

  if (isGuest) {
    return (
      <Screen padded={false}>
        <View style={styles.screen}>
          <FoodBackground topOffset={-insets.top} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, styles.guestContent]}
            onScroll={trackFloatingCartScrollDirection}
            scrollEventThrottle={16}
          >
            <Text style={[styles.heroTitle, styles.guestHeroTitle]}>{tr("Bună, Oaspete", "Hi, Guest")}</Text>
            <View style={styles.guestPanel}>
              <View style={styles.guestBadge}>
                <UserRound size={16} color={PROFILE_GREEN_DARK} strokeWidth={2.6} />
                <Text style={styles.guestBadgeLabel}>{tr("Cont YUMZY", "YUMZY account")}</Text>
              </View>
              <Text style={styles.guestTitle}>{tr("Intră în cont pentru sincronizare", "Sign in to sync")}</Text>
              <Text style={styles.guestText}>
                {tr(
                  "Profilul, adresele și istoricul comenzilor rămân sincronizate după autentificare.",
                  "Profile, addresses, and order history stay synced after authentication.",
                )}
              </Text>
              <Pressable style={({ pressed }) => [styles.guestCta, pressed && styles.guestCtaPressed]} onPress={logout}>
                <Text style={styles.guestCtaLabel}>{tr("Intră sau creează cont", "Sign in or create account")}</Text>
                <ChevronRight size={18} color={colors.white} strokeWidth={2.8} />
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.screen}>
        <FoodBackground topOffset={-insets.top} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={trackFloatingCartScrollDirection}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={PROFILE_GREEN} onRefresh={() => loadAccount("refresh")} />}
          contentContainerStyle={styles.content}
        >
        <View style={styles.heroRow}>
          <Text style={styles.heroTitle}>{tr("Bună", "Hi")}, {greetingName}</Text>
          <Pressable style={styles.refreshButton} onPress={() => loadAccount("refresh")} disabled={refreshing || loading}>
            {refreshing || loading ? <ActivityIndicator color={PROFILE_GREEN} /> : <RefreshCw size={18} color={colors.text} strokeWidth={2.6} />}
          </Pressable>
        </View>

        {loadError && <Text style={styles.errorBanner}>{loadError}</Text>}

        <View style={styles.sectionBlock}>
          <SectionHeader title={tr("Plată", "Payment")} action={tr("Editează", "Edit")} onPress={openPaymentMenu} />
          <Pressable style={styles.paymentMethodRow} onPress={openPaymentMenu}>
            <View style={styles.paymentBadge}>
              <CreditCard size={20} color={colors.white} strokeWidth={2.6} />
            </View>
            <View style={styles.paymentCopy}>
              <Text style={styles.paymentTitle}>{paymentTitle}</Text>
              <Text style={styles.inlineAction}>{tr("Schimbă metoda", "Change method")}</Text>
            </View>
            <Text style={styles.paymentHint} numberOfLines={1}>
              {paymentHint}
            </Text>
          </Pressable>
          <Divider />
          <Pressable style={styles.balanceRow} onPress={openOrders}>
            <Wallet size={22} color={colors.text} strokeWidth={2.4} />
            <Text style={styles.balanceTitle}>{tr("Sold ONE", "ONE balance")}</Text>
            <Text style={styles.balanceValue}>{formatLei(accountBalance)}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionBlock}>
          <SectionTitle title={tr("Profil", "Profile")} />
          <View style={styles.profileList}>
            <AccountRow
              icon={<UserRound size={22} color={colors.text} strokeWidth={2.4} />}
              action={tr("Editează", "Edit")}
              onPress={() => navigation.navigate("ProfileEdit", { field: "name" })}
            >
              {displayName}
            </AccountRow>
            <Divider />
            <AccountRow
              icon={<Phone size={22} color={colors.text} strokeWidth={2.4} />}
              action={tr("Editează", "Edit")}
              onPress={() => navigation.navigate("ProfileEdit", { field: "phone" })}
            >
              {user?.phone || tr("Adaugă număr", "Add number")}
            </AccountRow>
            <Divider />
            <AccountRow
              icon={<Mail size={22} color={colors.text} strokeWidth={2.4} />}
              action={tr("Editează", "Edit")}
              showCheck
              onPress={() => navigation.navigate("ProfileEdit", { field: "email" })}
            >
              {user?.email ?? tr("Adaugă email", "Add email")}
            </AccountRow>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <SectionTitle title={tr("Altele", "Other")} />
          <View style={styles.otherList}>
            <OtherRow
              title="ONE Plus"
              accent
              icon={<Plus size={24} color={colors.white} strokeWidth={3.6} />}
              onPress={() => showAppAlert("ONE Plus", tr("Abonamentele pot fi conectate când backend-ul expune planuri de membership.", "Subscriptions can be connected when backend exposes membership plans."))}
            />
            <OtherRow title={tr("Coduri promo", "Promo codes")} icon={<Tag size={22} color={colors.text} strokeWidth={2.4} />} onPress={() => navigation.navigate("ProfileEdit", { field: "promo" })} />
            <OtherRow title={t("profile.others.settings")} icon={<Settings size={22} color={colors.text} strokeWidth={2.4} />} onPress={() => navigation.navigate("ProfileSettings")} />
            <OtherRow
              title={t("profile.others.privacy")}
              icon={<Hand size={22} color={colors.text} strokeWidth={2.4} />}
              onPress={() => navigation.navigate("ProfileInfo", { topic: "privacy" })}
            />
            <OtherRow
              title={t("profile.others.about")}
              icon={<Info size={22} color={colors.text} strokeWidth={2.4} />}
              onPress={() => navigation.navigate("ProfileInfo", { topic: "about" })}
            />
            <OtherRow title={t("profile.others.support")} icon={<Mail size={22} color={colors.text} strokeWidth={2.4} />} onPress={() => navigation.navigate("ProfileInfo", { topic: "support" })} />
          </View>
        </View>

        </ScrollView>
        <PaymentMethodSheet
          visible={isPaymentMenuOpen}
          bottomInset={insets.bottom}
          methods={paymentMethods}
          selectedMethod={preferredPaymentMethod}
          tr={tr}
          onClose={() => setIsPaymentMenuOpen(false)}
          onSelect={selectPaymentMethod}
        />
      </View>
    </Screen>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function SectionHeader({ title, action, onPress }: { title: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      <Pressable style={styles.headerAction} onPress={onPress}>
        <Text style={styles.headerActionText}>{action}</Text>
        <ChevronRight size={20} color={colors.text} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

function AccountRow({ icon, children, action, showCheck, onPress }: AccountRowProps) {
  const content = (
    <>
      <View style={styles.accountIcon}>{icon}</View>
      <View style={styles.accountValueWrap}>
        <Text style={styles.accountValue} numberOfLines={1}>
          {children}
        </Text>
        {showCheck && <Check size={18} color={PROFILE_GREEN_DARK} strokeWidth={3} />}
      </View>
      {action && <Text style={styles.rowAction}>{action}</Text>}
    </>
  );

  if (!onPress) {
    return <View style={styles.accountRow}>{content}</View>;
  }

  return (
    <Pressable style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]} onPress={onPress}>
      {content}
    </Pressable>
  );
}

function OtherRow({ title, icon, onPress, accent }: OtherRowProps) {
  const content = (
    <>
      <View style={[styles.otherIcon, accent && styles.otherIconAccent]}>{icon}</View>
      <Text style={styles.otherTitle}>{title}</Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.otherRow}>{content}</View>;
  }

  return (
    <Pressable style={({ pressed }) => [styles.otherRow, pressed && styles.pressed]} onPress={onPress}>
      {content}
    </Pressable>
  );
}

function PaymentMethodSheet({
  visible,
  bottomInset,
  methods,
  selectedMethod,
  tr,
  onClose,
  onSelect,
}: {
  visible: boolean;
  bottomInset: number;
  methods: PaymentMethod[];
  selectedMethod: PaymentMethod;
  tr: (ro: string, en: string) => string;
  onClose: () => void;
  onSelect: (method: PaymentMethod) => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.paymentSheetRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.paymentSheet, { paddingBottom: Math.max(bottomInset, 14) }]}>
          <View style={styles.paymentSheetHandle} />
          <View style={styles.paymentSheetHeader}>
            <Text style={styles.paymentSheetTitle}>{tr("Metodă standard", "Default method")}</Text>
            <Pressable style={styles.paymentSheetClose} onPress={onClose} hitSlop={10}>
              <X size={18} color={colors.muted} strokeWidth={2.5} />
            </Pressable>
          </View>
          <View style={styles.paymentOptionGrid}>
            {methods.map((method) => {
              const isSelected = method === selectedMethod;

              return (
                <Pressable
                  key={method}
                  style={({ pressed }) => [
                    styles.paymentOptionButton,
                    isSelected && styles.paymentOptionButtonSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => onSelect(method)}
                >
                  <View style={[styles.paymentOptionIcon, isSelected && styles.paymentOptionIconSelected]}>
                    <PaymentMethodIcon method={method} selected={isSelected} />
                  </View>
                  <Text style={[styles.paymentOptionText, isSelected && styles.paymentOptionTextSelected]} numberOfLines={1}>
                    {paymentMethodLabel(method, tr)}
                  </Text>
                  {isSelected ? <Check size={14} color={PROFILE_GREEN_DARK} strokeWidth={3} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PaymentMethodIcon({ method, selected }: { method: PaymentMethod; selected: boolean }) {
  const color = selected ? PROFILE_GREEN_DARK : colors.text;

  if (method === "cash") return <Wallet size={17} color={color} strokeWidth={2.4} />;
  if (method === "card") return <CreditCard size={17} color={color} strokeWidth={2.4} />;
  if (method === "apple_pay") {
    return <Text style={[styles.paymentOptionLogo, selected && styles.paymentOptionLogoSelected]}></Text>;
  }
  return <Text style={[styles.paymentOptionLogo, selected && styles.paymentOptionLogoSelected]}>G</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function firstWord(value?: string) {
  return value?.trim().split(/\s+/)[0] ?? "";
}

function paymentMethodLabel(method: PaymentMethod, tr: (ro: string, en: string) => string) {
  if (method === "cash") return tr("Cash", "Cash");
  if (method === "card") return tr("Card", "Card");
  if (method === "apple_pay") return "Apple Pay";
  return "Google Pay";
}

function availablePaymentMethods(): PaymentMethod[] {
  const methods: PaymentMethod[] = ["cash", "card"];
  if (Platform.OS === "ios") methods.push("apple_pay");
  if (Platform.OS === "android") methods.push("google_pay");
  return methods;
}

function formatLei(value: number) {
  return `${new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} lei`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 96,
  },
  guestContent: {
    paddingTop: 46,
  },
  heroRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  heroTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
  },
  guestHeroTitle: {
    flex: 0,
    marginBottom: 10,
  },
  refreshButton: {
    width: 36,
    height: 36,
    marginTop: 2,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
  },
  errorBanner: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(34,197,94,0.14)",
    color: PROFILE_GREEN_DARK,
    padding: 13,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "500",
  },
  sectionTitle: {
    marginBottom: 14,
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
  sectionHeaderTitle: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
  sectionHeader: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionBlock: {
    marginTop: 24,
  },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerActionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  paymentMethodRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  paymentBadge: {
    width: 40,
    height: 26,
    borderRadius: 6,
    backgroundColor: PROFILE_GREEN_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentCopy: {
    flex: 1,
    gap: 4,
  },
  paymentTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "400",
  },
  inlineAction: {
    color: PROFILE_GREEN_DARK,
    fontSize: 13,
    fontWeight: "500",
  },
  paymentHint: {
    maxWidth: 110,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    textAlign: "right",
  },
  paymentSheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  paymentSheet: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: colors.card,
    paddingTop: 9,
    paddingHorizontal: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.34,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -12 },
    elevation: 20,
  },
  paymentSheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 14,
  },
  paymentSheetHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  paymentSheetTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
  },
  paymentSheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  paymentOptionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paymentOptionButton: {
    minHeight: 44,
    minWidth: 108,
    flexGrow: 1,
    flexBasis: "47%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paymentOptionButtonSelected: {
    borderColor: "rgba(34,197,94,0.55)",
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  paymentOptionIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  paymentOptionIconSelected: {
    backgroundColor: "rgba(34,197,94,0.16)",
  },
  paymentOptionLogo: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "800",
  },
  paymentOptionLogoSelected: {
    color: PROFILE_GREEN_DARK,
  },
  paymentOptionText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  paymentOptionTextSelected: {
    color: PROFILE_GREEN_DARK,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  balanceRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  balanceTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "400",
  },
  balanceValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "400",
  },
  profileList: {
    marginTop: -4,
  },
  accountRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  accountIcon: {
    width: 38,
    alignItems: "flex-start",
  },
  accountValueWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accountValue: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
  },
  rowAction: {
    color: PROFILE_GREEN_DARK,
    fontSize: 15,
    fontWeight: "400",
  },
  otherList: {
    gap: 16,
  },
  otherRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  otherIcon: {
    width: 38,
    height: 38,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  otherIconAccent: {
    width: 28,
    height: 28,
    marginRight: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PROFILE_GREEN_DARK,
  },
  otherTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
  },
  guestPanel: {
    marginTop: 24,
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: "rgba(7,10,14,0.72)",
    padding: 20,
    gap: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  guestBadge: {
    alignSelf: "flex-start",
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(34,197,94,0.16)",
  },
  guestBadgeLabel: {
    color: "#CFF6D9",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  guestTitle: {
    color: colors.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
  guestText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "400",
  },
  guestCta: {
    marginTop: 8,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: PROFILE_GREEN,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  guestCtaPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  guestCtaLabel: {
    color: "#CFF6D9",
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  pressed: {
    opacity: 0.82,
  },
});
