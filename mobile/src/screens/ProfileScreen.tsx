import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  BadgePercent,
  Check,
  ChevronRight,
  CreditCard,
  Hand,
  Info,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Settings,
  Tag,
  UserRound,
  Wallet,
  X,
} from "lucide-react-native";
import LottieView from "lottie-react-native";
import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Appearance,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

import { addressesApi } from "../api/addressesApi";
import { authApi } from "../api/authApi";
import { ordersApi } from "../api/ordersApi";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ProfileStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";
import { Address, Order, PaymentMethod } from "../types/models";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

type ThemePreference = "system" | "light" | "dark";

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
  const systemScheme = useColorScheme();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const isGuest = useAuthStore((state) => state.isGuest);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");

  useEffect(() => {
    if (editing) return;
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
    setPhone(user?.phone ?? "");
    setEmail(user?.email ?? "");
  }, [editing, user?.email, user?.first_name, user?.last_name, user?.phone]);

  const displayName = useMemo(
    () => user?.full_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || (isGuest ? "Oaspete" : "Client"),
    [isGuest, user?.first_name, user?.full_name, user?.last_name],
  );
  const greetingName = useMemo(() => firstWord(displayName) || firstWord(user?.email?.split("@")[0]) || "Client", [displayName, user?.email]);
  const defaultAddress = addresses.find((address) => address.is_default) ?? addresses[0];
  const lastPaymentOrder = orders.find((order) => order.payment_method !== "cash") ?? orders[0];
  const paymentMethod = lastPaymentOrder?.payment_method;
  const paymentTitle = paymentMethod ? paymentMethodLabel(paymentMethod) : "Adaugă metodă de plată";
  const paymentHint = lastPaymentOrder ? `Ultima comandă #${lastPaymentOrder.id}` : "Alegi la checkout";
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
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
        setLoadError("Nu am putut sincroniza toate datele contului. Trage în jos pentru reîncărcare.");
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

  const saveProfile = async () => {
    if (isGuest || !accessToken) return;
    if (!firstName.trim()) {
      setFormError("Prenumele este obligatoriu.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFormError("Folosește o adresă de email validă.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const updatedUser = await authApi.updateMe({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });
      setUser(updatedUser);
      setEditing(false);
    } catch {
      setFormError("Nu am putut salva profilul. Verifică backend-ul și încearcă din nou.");
    } finally {
      setSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!user?.email || isGuest) return;
    setResetLoading(true);
    try {
      await authApi.forgotPassword(user.email);
      Alert.alert("Email trimis", "Dacă există un cont activ, vei primi instrucțiuni de resetare.");
    } catch {
      Alert.alert("Eroare", "Nu am putut trimite emailul de resetare.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Delogare", "Vrei să ieși din cont?", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Delogare",
        style: "destructive",
        onPress: async () => {
          setLogoutLoading(true);
          try {
            if (refreshToken && !isGuest) {
              await authApi.logout(refreshToken);
            }
          } catch {
            // Clear the local session even if the backend token is already invalid.
          } finally {
            setLogoutLoading(false);
            logout();
          }
        },
      },
    ]);
  };

  const setTheme = (preference: ThemePreference) => {
    setThemePreference(preference);
    Appearance.setColorScheme(preference === "system" ? null : preference);
  };

  const openCart = () => navigation.getParent()?.navigate("CartTab", { screen: "CartHome" });
  const openOrders = () => navigation.getParent()?.navigate("OrdersTab", { screen: "OrdersHome" });

  const openPaymentHelp = () => {
    Alert.alert(
      "Plată",
      "ONE Dining Club trimite metoda de plată aleasă către backend atunci când plasezi o comandă. Cardurile salvate nu sunt stocate încă în acest backend.",
      [{ text: "Vezi comenzile", onPress: openOrders }, { text: "OK" }],
    );
  };

  if (isGuest) {
    return (
      <Screen padded={false}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={[styles.heroTitle, styles.guestHeroTitle]}>Bună, Oaspete</Text>
          <View style={styles.guestPanel}>
            <Text style={styles.guestTitle}>Intră în cont pentru sincronizare</Text>
            <Text style={styles.guestText}>Profilul, adresele și istoricul comenzilor sunt salvate în backend după autentificare.</Text>
            <PrimaryButton title="Intră sau creează cont" onPress={logout} />
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
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={() => loadAccount("refresh")} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.heroRow}>
          <Text style={styles.heroTitle}>Bună, {greetingName}</Text>
          <Pressable style={styles.refreshButton} onPress={() => loadAccount("refresh")} disabled={refreshing || loading}>
            {refreshing || loading ? <ActivityIndicator color={colors.red} /> : <RefreshCw size={18} color={colors.text} strokeWidth={2.6} />}
          </Pressable>
        </View>

        {loadError && <Text style={styles.errorBanner}>{loadError}</Text>}

        <SectionHeader title="Plată" action="Editează" onPress={openPaymentHelp} />
        <Pressable style={styles.paymentMethodRow} onPress={openPaymentHelp}>
          <View style={styles.paymentBadge}>
            <CreditCard size={20} color={colors.white} strokeWidth={2.6} />
          </View>
          <View style={styles.paymentCopy}>
            <Text style={styles.paymentTitle}>{paymentTitle}</Text>
            <Text style={styles.inlineAction}>Schimbă</Text>
          </View>
          <Text style={styles.paymentHint} numberOfLines={1}>
            {paymentHint}
          </Text>
        </Pressable>
        <Divider />
        <Pressable style={styles.balanceRow} onPress={openOrders}>
          <Wallet size={22} color={colors.text} strokeWidth={2.4} />
          <Text style={styles.balanceTitle}>Sold ONE</Text>
          <Text style={styles.balanceValue}>{formatLei(accountBalance)}</Text>
        </Pressable>

        <SectionTitle title="Profil" />
        <View style={styles.profileList}>
          <AccountRow icon={<UserRound size={22} color={colors.text} strokeWidth={2.4} />} action="Editează" onPress={() => setEditing(true)}>
            {displayName}
          </AccountRow>
          <Divider />
          <AccountRow icon={<Phone size={22} color={colors.text} strokeWidth={2.4} />} action="Editează" onPress={() => setEditing(true)}>
            {user?.phone || "Adaugă număr"}
          </AccountRow>
          <Divider />
          <AccountRow icon={<Mail size={22} color={colors.text} strokeWidth={2.4} />} action="Editează" showCheck onPress={() => setEditing(true)}>
            {user?.email ?? "Adaugă email"}
          </AccountRow>
        </View>

        {editing && (
          <View style={styles.editPanel}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Editează profilul</Text>
              <Pressable style={styles.editClose} onPress={() => setEditing(false)}>
                <X size={20} color={colors.text} strokeWidth={2.6} />
              </Pressable>
            </View>
            <ProfileInput label="Prenume" value={firstName} onChangeText={setFirstName} />
            <ProfileInput label="Nume" value={lastName} onChangeText={setLastName} />
            <ProfileInput label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <ProfileInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            {formError && <Text style={styles.formError}>{formError}</Text>}
            <PrimaryButton title={saving ? "Se salvează..." : "Salvează modificările"} onPress={saveProfile} disabled={saving} />
          </View>
        )}

        <SectionTitle title="Temă" />
        <View style={styles.themeGrid}>
          <ThemeOption label="Sistem" value="system" selected={themePreference === "system"} onPress={setTheme} />
          <ThemeOption label="Luminos" value="light" selected={themePreference === "light"} onPress={setTheme} />
          <ThemeOption label="Întunecat" value="dark" selected={themePreference === "dark"} onPress={setTheme} />
        </View>
        <Text style={styles.themeFootnote}>Tema dispozitivului: {systemScheme === "dark" ? "întunecată" : "luminoasă"}</Text>

        <SectionTitle title="Altele" />
        <View style={styles.otherList}>
          <OtherRow
            title="ONE Plus"
            accent
            icon={<Plus size={24} color={colors.white} strokeWidth={3.6} />}
            onPress={() => Alert.alert("ONE Plus", "Abonamentele pot fi conectate când backend-ul expune planuri de membership.")}
          />
          <OtherRow title="Coduri promo" icon={<Tag size={22} color={colors.text} strokeWidth={2.4} />} onPress={openCart} />
          <OtherRow title="Setări" icon={<Settings size={22} color={colors.text} strokeWidth={2.4} />} onPress={() => navigation.navigate("Address")} />
          <OtherRow
            title="Confidențialitate"
            icon={<Hand size={22} color={colors.text} strokeWidth={2.4} />}
            onPress={() => Alert.alert("Confidențialitate", "Profilul este încărcat din /auth/me/, iar comenzile și adresele sunt cerute cu tokenul tău de acces.")}
          />
          <OtherRow
            title="Despre"
            icon={<Info size={22} color={colors.text} strokeWidth={2.4} />}
            onPress={() => Alert.alert("Despre ONE Dining Club", `Comenzi: ${orders.length}\nTotal cheltuit: ${formatLei(totalSpent)}`)}
          />
          <OtherRow title={resetLoading ? "Se trimite..." : "Suport"} icon={<BadgePercent size={22} color={colors.text} strokeWidth={2.4} />} onPress={sendPasswordReset} />
        </View>

        <CourierCard defaultAddress={defaultAddress} />

        <Pressable style={styles.logoutRow} onPress={handleLogout} disabled={logoutLoading}>
          <LogOut size={20} color={colors.redDark} strokeWidth={2.5} />
          <Text style={styles.logoutText}>{logoutLoading ? "Se deloghează..." : "Delogare"}</Text>
        </Pressable>
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

function ProfileInput({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "phone-pad" | "email-address";
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
        placeholder={label}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
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

function CourierCard({ defaultAddress }: { defaultAddress?: Address }) {
  return (
    <View style={styles.courierCard}>
      <View style={styles.courierCopy}>
        <Text style={styles.courierTitle}>Devino curier</Text>
        <Text style={styles.courierText}>Câștigă în ritmul tău</Text>
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
        <View style={styles.deliveryBag}>
          <Image source={require("../../assets/one-dining-logo.png")} style={styles.deliveryLogo} />
        </View>
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

function paymentMethodLabel(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    cash: "Numerar",
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
    marginTop: 14,
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
    marginTop: 22,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  editPanel: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
  },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  editClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: colors.text,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    fontWeight: "400",
  },
  formError: {
    color: colors.redDark,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
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
    minHeight: 116,
    marginTop: 24,
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
    height: 116,
  },
  deliveryLottie: {
    position: "absolute",
    right: -30,
    bottom: -30,
    width: 144,
    height: 144,
  },
  deliveryBag: {
    position: "absolute",
    right: 66,
    bottom: 20,
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "10deg" }],
  },
  deliveryLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  logoutRow: {
    minHeight: 52,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  logoutText: {
    color: colors.redDark,
    fontSize: 15,
    fontWeight: "600",
  },
  guestPanel: {
    marginTop: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 18,
    gap: 12,
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
  pressed: {
    opacity: 0.82,
  },
});
