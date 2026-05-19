import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Check,
  ChevronRight,
  CreditCard,
  Hand,
  Info,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Settings,
  Tag,
  UserRound,
  Wallet,
} from "lucide-react-native";
import LottieView from "lottie-react-native";
import { ReactElement, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Appearance,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { addressesApi } from "../api/addressesApi";
import { authApi } from "../api/authApi";
import { ordersApi } from "../api/ordersApi";
import { Screen } from "../components/Screen";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { ProfileStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { ThemePreference, usePreferencesStore } from "../store/preferencesStore";
import { colors } from "../theme/colors";
import { Address, Order, PaymentMethod } from "../types/models";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

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
  const systemScheme = useColorScheme();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isGuest = useAuthStore((state) => state.isGuest);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const themePreference = usePreferencesStore((state) => state.themePreference);
  const setThemePreference = usePreferencesStore((state) => state.setThemePreference);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();

  const displayName = useMemo(
    () => user?.full_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || (isGuest ? tr("Oaspete", "Guest") : tr("Client", "Customer")),
    [isGuest, user?.first_name, user?.full_name, user?.last_name],
  );
  const greetingName = useMemo(() => firstWord(displayName) || firstWord(user?.email?.split("@")[0]) || tr("Client", "Customer"), [displayName, tr, user?.email]);
  const defaultAddress = addresses.find((address) => address.is_default) ?? addresses[0];
  const lastPaymentOrder = orders.find((order) => order.payment_method !== "cash") ?? orders[0];
  const paymentMethod = lastPaymentOrder?.payment_method;
  const paymentTitle = paymentMethod ? paymentMethodLabel(paymentMethod, tr) : tr("Adaugă metodă de plată", "Add payment method");
  const paymentHint = lastPaymentOrder ? tr(`Ultima comandă #${lastPaymentOrder.id}`, `Last order #${lastPaymentOrder.id}`) : tr("Alegi la checkout", "Choose at checkout");
  const accountBalance = 0;

  const loadAccount = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (isGuest || !accessToken) {
        setAddresses([]);
        setOrders([]);
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

      const [profileResult, addressResult, orderResult] = await Promise.allSettled([
        authApi.me(),
        addressesApi.list(),
        ordersApi.list(),
      ]);

      if (profileResult.status === "fulfilled") setUser(profileResult.value);
      if (addressResult.status === "fulfilled") setAddresses(addressResult.value);
      if (orderResult.status === "fulfilled") setOrders(orderResult.value);

      if ([profileResult, addressResult, orderResult].some((result) => result.status === "rejected")) {
        setLoadError(tr("Nu am putut sincroniza toate datele contului. Trage în jos pentru reîncărcare.", "Could not sync all account data. Pull down to refresh."));
      }

      setLoading(false);
      setRefreshing(false);
    },
    [accessToken, isGuest, setUser],
  );

  useFocusEffect(
    useCallback(() => {
      loadAccount();
    }, [loadAccount]),
  );

  const setTheme = (preference: ThemePreference) => {
    setThemePreference(preference);
    Appearance.setColorScheme(preference === "system" ? null : preference);
  };

  const openCart = () => navigation.getParent()?.navigate("CartTab", { screen: "CartHome" });
  const openOrders = () => navigation.getParent()?.navigate("OrdersTab", { screen: "OrdersHome" });

  const openPaymentHelp = () => {
    Alert.alert(
      tr("Plată", "Payment"),
      tr("ONE Dining Club trimite metoda de plată aleasă către backend atunci când plasezi o comandă. Cardurile salvate nu sunt stocate încă în acest backend.", "ONE Dining Club sends your selected payment method to the backend when you place an order. Saved cards are not stored in this backend yet."),
      [{ text: tr("Vezi comenzile", "View orders"), onPress: openOrders }, { text: "OK" }],
    );
  };

  if (isGuest) {
    return (
      <Screen padded={false}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          onScroll={trackFloatingCartScrollDirection}
          scrollEventThrottle={16}
        >
          <Text style={[styles.heroTitle, styles.guestHeroTitle]}>{tr("Bună, Oaspete", "Hi, Guest")}</Text>
          <View style={styles.guestPanel}>
            <Text style={styles.guestTitle}>{tr("Intră în cont pentru sincronizare", "Sign in to sync")}</Text>
            <Text style={styles.guestText}>{tr("Profilul, adresele și istoricul comenzilor sunt salvate în backend după autentificare.", "Profile, addresses, and order history are saved in backend after authentication.")}</Text>
            <Pressable style={({ pressed }) => [styles.guestCta, pressed && styles.guestCtaPressed]} onPress={logout}>
              <Text style={styles.guestCtaLabel}>{tr("Intră sau creează cont", "Sign in or create account")}</Text>
              <ChevronRight size={18} color={colors.white} strokeWidth={2.8} />
            </Pressable>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={trackFloatingCartScrollDirection}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={() => loadAccount("refresh")} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.heroRow}>
          <Text style={styles.heroTitle}>{tr("Bună", "Hi")}, {greetingName}</Text>
          <Pressable style={styles.refreshButton} onPress={() => loadAccount("refresh")} disabled={refreshing || loading}>
            {refreshing || loading ? <ActivityIndicator color={colors.red} /> : <RefreshCw size={18} color={colors.text} strokeWidth={2.6} />}
          </Pressable>
        </View>

        {loadError && <Text style={styles.errorBanner}>{loadError}</Text>}

        <View style={styles.sectionBlock}>
          <SectionHeader title={tr("Plată", "Payment")} action={tr("Editează", "Edit")} onPress={openPaymentHelp} />
          <Pressable style={styles.paymentMethodRow} onPress={openPaymentHelp}>
            <View style={styles.paymentBadge}>
              <CreditCard size={20} color={colors.white} strokeWidth={2.6} />
            </View>
            <View style={styles.paymentCopy}>
              <Text style={styles.paymentTitle}>{paymentTitle}</Text>
              <Text style={styles.inlineAction}>{tr("Schimbă", "Change")}</Text>
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
          <SectionTitle title={tr("Temă", "Theme")} />
          <View style={styles.themeGrid}>
            <ThemeOption label={tr("Sistem", "System")} value="system" selected={themePreference === "system"} onPress={setTheme} />
            <ThemeOption label={tr("Luminos", "Light")} value="light" selected={themePreference === "light"} onPress={setTheme} />
            <ThemeOption label={tr("Întunecat", "Dark")} value="dark" selected={themePreference === "dark"} onPress={setTheme} />
          </View>
          <Text style={styles.themeFootnote}>{tr("Tema dispozitivului", "Device theme")}: {systemScheme === "dark" ? tr("întunecată", "dark") : tr("luminoasă", "light")}</Text>
        </View>

        <View style={styles.sectionBlock}>
          <SectionTitle title={tr("Altele", "Other")} />
          <View style={styles.otherList}>
            <OtherRow
              title="ONE Plus"
              accent
              icon={<Plus size={24} color={colors.white} strokeWidth={3.6} />}
              onPress={() => Alert.alert("ONE Plus", tr("Abonamentele pot fi conectate când backend-ul expune planuri de membership.", "Subscriptions can be connected when backend exposes membership plans."))}
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

        <CourierCard defaultAddress={defaultAddress} tr={tr} />
      </ScrollView>
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
        {showCheck && <Check size={18} color={colors.redDark} strokeWidth={3} />}
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

function ThemeOption({
  label,
  value,
  selected,
  onPress,
}: {
  label: string;
  value: ThemePreference;
  selected: boolean;
  onPress: (value: ThemePreference) => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.themeOption, pressed && styles.pressed]} onPress={() => onPress(value)}>
      <View style={[styles.themeOuter, selected && styles.themeOuterSelected]}>
        <ThemeSymbol value={value} />
      </View>
      <Text style={styles.themeLabel}>{label}</Text>
    </Pressable>
  );
}

function ThemeSymbol({ value }: { value: ThemePreference }) {
  if (value === "system") {
    return (
      <View style={styles.systemSymbol}>
        <View style={styles.systemDarkHalf} />
      </View>
    );
  }

  if (value === "dark") {
    return <View style={styles.darkSymbol} />;
  }

  return <View style={styles.lightSymbol} />;
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

function CourierCard({ defaultAddress, tr }: { defaultAddress?: Address; tr: (ro: string, en: string) => string }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  return (
    <View style={styles.courierCard}>
      <View style={styles.courierCopy}>
        <Text style={[styles.courierTitle, isDarkMode && styles.courierTextDark]}>{tr("Devino curier", "Become a courier")}</Text>
        <Text style={[styles.courierText, isDarkMode && styles.courierTextDark]}>{tr("Câștigă în ritmul tău", "Earn at your own pace")}</Text>
        {defaultAddress && (
          <View style={styles.addressPill}>
            <MapPin size={14} color={colors.redDark} strokeWidth={2.4} />
            <Text style={styles.addressPillText} numberOfLines={1}>
              {defaultAddress.city}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.deliveryVisual}>
        <LottieView source={require("../../assets/man-delivery.lottie")} autoPlay loop style={styles.deliveryLottie} />
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function firstWord(value?: string) {
  return value?.trim().split(/\s+/)[0] ?? "";
}

function paymentMethodLabel(method: PaymentMethod, tr: (ro: string, en: string) => string) {
  const labels: Record<PaymentMethod, string> = {
    cash: tr("Numerar", "Cash"),
    card: "Card",
    apple_pay: "Apple Pay",
    google_pay: "Google Pay",
  };
  return labels[method];
}

function formatLei(value: number) {
  return `${new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} lei`;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 96,
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
    marginBottom: 18,
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
    backgroundColor: "#FDE8E8",
    color: colors.redDark,
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
    backgroundColor: colors.redDark,
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
    color: colors.redDark,
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
    color: colors.redDark,
    fontSize: 15,
    fontWeight: "400",
  },
  themeGrid: {
    marginTop: 2,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  themeOption: {
    alignItems: "center",
    gap: 8,
  },
  themeOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 8,
    borderColor: "#EEF1F1",
    alignItems: "center",
    justifyContent: "center",
  },
  themeOuterSelected: {
    borderColor: colors.redDark,
  },
  systemSymbol: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  systemDarkHalf: {
    position: "absolute",
    right: -12,
    bottom: -12,
    width: 50,
    height: 50,
    backgroundColor: "#000000",
    transform: [{ rotate: "45deg" }],
  },
  lightSymbol: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  darkSymbol: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000000",
  },
  themeLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "400",
  },
  themeFootnote: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "400",
    textAlign: "center",
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
    backgroundColor: colors.redDark,
  },
  otherTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
  },
  courierCard: {
    height: 116,
    marginTop: 44,
    borderRadius: 12,
    backgroundColor: "#FDE8E8",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
  },
  courierCopy: {
    flex: 1,
    gap: 7,
    zIndex: 2,
  },
  courierTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  courierText: {
    maxWidth: 210,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  courierTextDark: {
    color: "#000000",
  },
  addressPill: {
    marginTop: 4,
    alignSelf: "flex-start",
    maxWidth: 170,
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  addressPillText: {
    color: colors.redDark,
    fontSize: 12,
    fontWeight: "600",
  },
  deliveryVisual: {
    width: 124,
    height: "100%",
    borderTopLeftRadius: 26,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 22,
    overflow: "hidden",
  },
  deliveryLottie: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 144,
    height: "100%",
  },
  guestPanel: {
    marginTop: 4,
    borderRadius: 18,
    backgroundColor: colors.cardSoft,
    padding: 18,
    gap: 14,
  },
  guestTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  guestText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  guestCta: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.redDark,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#7A0A0A",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  guestCtaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  guestCtaLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.82,
  },
});
