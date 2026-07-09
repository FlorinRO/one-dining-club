import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  Bell,
  CarFront,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  FileText,
  Headphones,
  LockKeyhole,
  Mail,
  MapPinned,
  Shield,
} from "lucide-react-native";
import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authApi } from "../api/authApi";
import { courierApi } from "../api/courierApi";
import { formatMoney, titleCaseVehicle } from "../lib/format";
import { RootStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { useCourierStore } from "../store/courierStore";
import { CourierDocument, CourierProfile, CourierSupportTicket } from "../types/models";

type BasicProps<RouteName extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, RouteName>;
type VehicleType = CourierProfile["vehicle_type"];
type NavigationApp = CourierProfile["preferred_navigation_app"];
type AppLanguage = CourierProfile["app_language"];

const vehicleOptions: Array<{ value: VehicleType; label: string; description: string }> = [
  { value: "bike", label: "Bicicletă", description: "Potrivită pentru zone dense și curse scurte." },
  { value: "scooter", label: "Scuter", description: "Timp bun de livrare și autonomie bună." },
  { value: "car", label: "Mașină", description: "Curse mai lungi și volum mai mare." },
  { value: "walk", label: "Pietonal", description: "Ridicări apropiate și zone centrale." },
];

const navigationOptions: Array<{ value: NavigationApp; label: string }> = [
  { value: "google_maps", label: "Google Maps" },
  { value: "apple_maps", label: "Apple Maps" },
  { value: "waze", label: "Waze" },
];

const languageOptions: Array<{ value: AppLanguage; label: string }> = [
  { value: "ro", label: "Română" },
  { value: "en", label: "English" },
];

export function ProfilePersonalScreen({ navigation }: BasicProps<"ProfilePersonal">) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const profile = useCourierStore((state) => state.profile);
  const refreshProfile = useCourierStore((state) => state.refreshProfile);
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(profile?.phone || user?.phone || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
    setPhone(profile?.phone || user?.phone || "");
  }, [profile?.phone, user?.first_name, user?.last_name, user?.phone]);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile().catch(() => undefined);
    }, [refreshProfile]),
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanPhone = phone.trim();
      const updatedUser = await authApi.updateMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: cleanPhone,
      });
      await courierApi.updateProfile({ phone: cleanPhone });
      setUser(updatedUser);
      await refreshProfile();
      Alert.alert("Profil actualizat", "Datele personale au fost salvate în backend.");
    } catch {
      Alert.alert("Eroare", "Nu am putut salva datele personale.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileShell title="Date personale" onBack={navigation.goBack}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.card}>
          <DetailRow icon={<Mail color={palette.green} size={18} />} label="Email" value={user?.email || profile?.email || "N/A"} />
          <DetailRow
            icon={<Shield color={palette.green} size={18} />}
            label="Status verificare"
            value={profile?.is_verified ? "Verificat" : "În verificare"}
          />
        </View>

        <View style={styles.formCard}>
          <FormField label="Prenume" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <FormField label="Nume" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          <FormField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <ActionButton title={saving ? "Se salvează..." : "Salvează"} onPress={handleSave} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </ProfileShell>
  );
}

export function ProfileEarningsScreen({ navigation }: BasicProps<"ProfileEarnings">) {
  const operationsSummary = useCourierStore((state) => state.operationsSummary);
  const operationsLoading = useCourierStore((state) => state.operationsLoading);
  const refreshOperationsSummary = useCourierStore((state) => state.refreshOperationsSummary);

  useFocusEffect(
    useCallback(() => {
      void refreshOperationsSummary().catch(() => undefined);
    }, [refreshOperationsSummary]),
  );

  const recentDeliveries = operationsSummary?.recent_deliveries ?? [];

  return (
    <ProfileShell
      title="Plăți și încasări"
      onBack={navigation.goBack}
      refreshing={operationsLoading}
      onRefresh={refreshOperationsSummary}
    >
      <View style={styles.balanceHero}>
        <Text style={styles.balanceLabel}>Sold disponibil</Text>
        <Text style={styles.balanceAmount}>{formatMoney(operationsSummary?.available_balance ?? 0)}</Text>
        <Text style={styles.balanceHint}>Actualizat din curse reale și simulări finalizate.</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatTile label="Azi" value={formatMoney(operationsSummary?.earnings_today ?? 0)} />
        <StatTile label="Săptămâna asta" value={formatMoney(operationsSummary?.earnings_this_week ?? 0)} />
        <StatTile label="Luna asta" value={formatMoney(operationsSummary?.earnings_this_month ?? 0)} />
        <StatTile label="Curse totale" value={String(operationsSummary?.completed_total ?? 0)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ultimele încasări</Text>
        {recentDeliveries.map((delivery) => (
          <Pressable
            key={delivery.id}
            style={styles.compactRow}
            onPress={() => navigation.navigate("CompletedDeliveryDetails", { deliveryId: delivery.id })}
          >
            <View style={styles.compactRowText}>
              <Text style={styles.compactRowTitle}>{delivery.restaurant_name}</Text>
              <Text style={styles.compactRowMeta}>{formatDate(delivery.completed_at)}</Text>
            </View>
            <View style={styles.compactRowRight}>
              <Text style={styles.successValue}>{formatMoney(delivery.delivery_fee)}</Text>
              <ChevronRight color={palette.ink} size={20} />
            </View>
          </Pressable>
        ))}
        {!recentDeliveries.length ? <EmptyText text="Nu există încă încasări în ultimele 7 zile." /> : null}
      </View>
    </ProfileShell>
  );
}

export function ProfileVehicleScreen({ navigation }: BasicProps<"ProfileVehicle">) {
  const profile = useCourierStore((state) => state.profile);
  const refreshProfile = useCourierStore((state) => state.refreshProfile);
  const [vehicleType, setVehicleType] = useState<VehicleType>(profile?.vehicle_type ?? "bike");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.vehicle_type) {
      setVehicleType(profile.vehicle_type);
    }
  }, [profile?.vehicle_type]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await courierApi.updateProfile({ vehicle_type: vehicleType });
      await refreshProfile();
      Alert.alert("Vehicul actualizat", "Vehiculul activ a fost salvat.");
    } catch {
      Alert.alert("Eroare", "Nu am putut actualiza vehiculul.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileShell title="Vehicul" onBack={navigation.goBack}>
      <View style={styles.card}>
        <DetailRow icon={<CarFront color={palette.green} size={18} />} label="Vehicul backend" value={titleCaseVehicle(profile?.vehicle_type ?? vehicleType)} />
        <DetailRow
          icon={<MapPinned color={palette.green} size={18} />}
          label="Locație live"
          value={hasProfileLocation(profile) ? "Sincronizată" : "Nesincronizată"}
        />
      </View>

      <View style={styles.optionList}>
        {vehicleOptions.map((option) => (
          <SelectableRow
            key={option.value}
            title={option.label}
            description={option.description}
            selected={vehicleType === option.value}
            onPress={() => setVehicleType(option.value)}
          />
        ))}
      </View>
      <ActionButton title={saving ? "Se salvează..." : "Salvează vehicul"} onPress={handleSave} disabled={saving} />
    </ProfileShell>
  );
}

export function ProfileDocumentsScreen({ navigation }: BasicProps<"ProfileDocuments">) {
  const [documents, setDocuments] = useState<CourierDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingType, setSubmittingType] = useState<CourierDocument["document_type"] | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      setDocuments(await courierApi.listDocuments());
    } catch {
      Alert.alert("Eroare", "Nu am putut încărca documentele.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDocuments();
    }, [loadDocuments]),
  );

  const handleSubmitDocument = async (document: CourierDocument) => {
    setSubmittingType(document.document_type);
    try {
      await courierApi.submitDocument({
        document_type: document.document_type,
        file_name: `Solicitare mobilă ${formatDate(new Date().toISOString())}`,
      });
      await loadDocuments();
      Alert.alert("Document trimis", "Documentul a intrat în verificare.");
    } catch {
      Alert.alert("Eroare", "Nu am putut trimite documentul.");
    } finally {
      setSubmittingType(null);
    }
  };

  return (
    <ProfileShell title="Documente" onBack={navigation.goBack} refreshing={loading} onRefresh={loadDocuments}>
      {loading && !documents.length ? <LoadingCard text="Se încarcă documentele..." /> : null}
      <View style={styles.optionList}>
        {documents.map((document) => (
          <View key={document.document_type} style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={styles.documentIconWrap}>
                <FileText color={palette.green} size={22} />
              </View>
              <View style={styles.documentTitleWrap}>
                <Text style={styles.documentTitle}>{documentLabel(document)}</Text>
                <Text style={styles.documentMeta}>{document.file_name || "Fără fișier activ"}</Text>
              </View>
              <StatusBadge status={document.status} />
            </View>
            {document.review_note ? <Text style={styles.documentNote}>{document.review_note}</Text> : null}
            {document.status !== "approved" ? (
              <ActionButton
                title={submittingType === document.document_type ? "Se trimite..." : "Trimite spre verificare"}
                onPress={() => handleSubmitDocument(document)}
                disabled={Boolean(submittingType)}
                compact
              />
            ) : null}
          </View>
        ))}
      </View>
    </ProfileShell>
  );
}

export function ProfileSettingsScreen({ navigation }: BasicProps<"ProfileSettings">) {
  const profile = useCourierStore((state) => state.profile);
  const refreshProfile = useCourierStore((state) => state.refreshProfile);
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.app_notifications_enabled ?? true);
  const [routeAlertsEnabled, setRouteAlertsEnabled] = useState(profile?.route_alerts_enabled ?? true);
  const [navigationApp, setNavigationApp] = useState<NavigationApp>(profile?.preferred_navigation_app ?? "google_maps");
  const [language, setLanguage] = useState<AppLanguage>(profile?.app_language ?? "ro");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }
    setNotificationsEnabled(profile.app_notifications_enabled);
    setRouteAlertsEnabled(profile.route_alerts_enabled);
    setNavigationApp(profile.preferred_navigation_app);
    setLanguage(profile.app_language);
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await courierApi.updateProfile({
        app_notifications_enabled: notificationsEnabled,
        route_alerts_enabled: routeAlertsEnabled,
        preferred_navigation_app: navigationApp,
        app_language: language,
      });
      await refreshProfile();
      Alert.alert("Setări salvate", "Preferințele au fost actualizate.");
    } catch {
      Alert.alert("Eroare", "Nu am putut salva setările.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileShell title="Setări aplicație" onBack={navigation.goBack}>
      <View style={styles.card}>
        <SwitchRow
          icon={<Bell color={palette.green} size={18} />}
          label="Notificări aplicație"
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
        />
        <SwitchRow
          icon={<MapPinned color={palette.green} size={18} />}
          label="Alerte traseu"
          value={routeAlertsEnabled}
          onValueChange={setRouteAlertsEnabled}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Navigație</Text>
        <SegmentedOptions options={navigationOptions} value={navigationApp} onChange={setNavigationApp} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Limbă</Text>
        <SegmentedOptions options={languageOptions} value={language} onChange={setLanguage} />
      </View>

      <ActionButton title={saving ? "Se salvează..." : "Salvează setări"} onPress={handleSave} disabled={saving} />
    </ProfileShell>
  );
}

export function ProfileSecurityScreen({ navigation }: BasicProps<"ProfileSecurity">) {
  const user = useAuthStore((state) => state.user);
  const [sendingReset, setSendingReset] = useState(false);

  const handlePasswordReset = async () => {
    if (!user?.email) {
      Alert.alert("Email lipsă", "Contul nu are un email disponibil pentru resetarea parolei.");
      return;
    }

    setSendingReset(true);
    try {
      await authApi.forgotPassword(user.email, "courier");
      Alert.alert("Email trimis", "Am trimis instrucțiunile de resetare a parolei.");
    } catch {
      Alert.alert("Eroare", "Nu am putut trimite emailul de resetare.");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <ProfileShell title="Securitate" onBack={navigation.goBack}>
      <View style={styles.card}>
        <DetailRow icon={<Mail color={palette.green} size={18} />} label="Email autentificare" value={user?.email || "N/A"} />
        <DetailRow icon={<LockKeyhole color={palette.green} size={18} />} label="Ultima autentificare" value={formatDate(user?.last_login)} />
        <DetailRow icon={<Shield color={palette.green} size={18} />} label="Cont activ" value={user?.is_active === false ? "Inactiv" : "Activ"} />
      </View>
      <ActionButton title={sendingReset ? "Se trimite..." : "Resetează parola"} onPress={handlePasswordReset} disabled={sendingReset} />
    </ProfileShell>
  );
}

export function ProfileHelpCenterScreen({ navigation }: BasicProps<"ProfileHelpCenter">) {
  const [articles, setArticles] = useState<Array<{ id: string; title: string; body: string }>>([]);
  const [supportEmail, setSupportEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const loadHelp = useCallback(async () => {
    setLoading(true);
    try {
      const helpCenter = await courierApi.getHelpCenter();
      setArticles(helpCenter.articles);
      setSupportEmail(helpCenter.support_email);
    } catch {
      Alert.alert("Eroare", "Nu am putut încărca centrul de ajutor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHelp();
    }, [loadHelp]),
  );

  return (
    <ProfileShell title="Centru de ajutor" onBack={navigation.goBack} refreshing={loading} onRefresh={loadHelp}>
      {loading && !articles.length ? <LoadingCard text="Se încarcă articolele..." /> : null}
      <View style={styles.optionList}>
        {articles.map((article) => (
          <View key={article.id} style={styles.helpCard}>
            <View style={styles.helpHeader}>
              <CircleHelp color={palette.green} size={20} />
              <Text style={styles.helpTitle}>{article.title}</Text>
            </View>
            <Text style={styles.helpBody}>{article.body}</Text>
          </View>
        ))}
      </View>
      <Pressable style={styles.contactCard} onPress={() => navigation.navigate("ProfileSupport")}>
        <View style={styles.contactIcon}>
          <Headphones color={palette.green} size={22} />
        </View>
        <View style={styles.contactText}>
          <Text style={styles.contactTitle}>Contactează suportul</Text>
          <Text style={styles.contactMeta}>{supportEmail || "support@yumzy.ro"}</Text>
        </View>
        <ChevronRight color={palette.ink} size={22} />
      </Pressable>
    </ProfileShell>
  );
}

export function ProfileSupportScreen({ navigation }: BasicProps<"ProfileSupport">) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<CourierSupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      setTickets(await courierApi.listSupportTickets());
    } catch {
      Alert.alert("Eroare", "Nu am putut încărca tichetele de suport.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTickets();
    }, [loadTickets]),
  );

  const handleCreateTicket = async () => {
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (!cleanSubject || !cleanMessage) {
      Alert.alert("Date incomplete", "Completează subiectul și mesajul.");
      return;
    }

    setSending(true);
    try {
      await courierApi.createSupportTicket({ subject: cleanSubject, message: cleanMessage });
      setSubject("");
      setMessage("");
      await loadTickets();
      Alert.alert("Tichet creat", "Mesajul a fost trimis către suport.");
    } catch {
      Alert.alert("Eroare", "Nu am putut crea tichetul de suport.");
    } finally {
      setSending(false);
    }
  };

  return (
    <ProfileShell title="Contact suport" onBack={navigation.goBack} refreshing={loading} onRefresh={loadTickets}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.formCard}>
          <FormField label="Subiect" value={subject} onChangeText={setSubject} />
          <FormField label="Mesaj" value={message} onChangeText={setMessage} multiline minHeight={110} />
          <ActionButton title={sending ? "Se trimite..." : "Trimite mesaj"} onPress={handleCreateTicket} disabled={sending} />
        </View>
      </KeyboardAvoidingView>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tichete recente</Text>
        {tickets.map((ticket) => (
          <View key={ticket.id} style={styles.ticketRow}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketSubject}>{ticket.subject}</Text>
              <StatusBadge status={ticket.status} />
            </View>
            <Text style={styles.ticketMessage} numberOfLines={2}>
              {ticket.message}
            </Text>
            <Text style={styles.compactRowMeta}>{formatDate(ticket.created_at)}</Text>
          </View>
        ))}
        {!tickets.length ? <EmptyText text="Nu există tichete deschise." /> : null}
      </View>
    </ProfileShell>
  );
}

function ProfileShell({
  title,
  onBack,
  children,
  refreshing = false,
  onRefresh,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 8, 20),
            paddingBottom: Math.max(insets.bottom + 28, 48),
          },
        ]}
        refreshControl={
          onRefresh ? <RefreshControl tintColor={palette.green} refreshing={refreshing} onRefresh={onRefresh} /> : undefined
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={onBack} style={styles.headerButton}>
            <ArrowLeft color={palette.ink} size={24} strokeWidth={2.3} />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerButton} />
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize = "sentences",
  multiline = false,
  minHeight,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  minHeight?: number;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.input, multiline && styles.inputMultiline, minHeight ? { minHeight } : null]}
      />
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  disabled = false,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable style={[styles.actionButton, compact && styles.actionButtonCompact, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.actionButtonText}>{title}</Text>
    </Pressable>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statTileValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statTileLabel}>{label}</Text>
    </View>
  );
}

function SelectableRow({
  title,
  description,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.selectableRow, selected && styles.selectableRowSelected]} onPress={onPress}>
      <View style={styles.selectableText}>
        <Text style={styles.selectableTitle}>{title}</Text>
        <Text style={styles.selectableDescription}>{description}</Text>
      </View>
      {selected ? <CheckCircle2 color={palette.green} size={23} /> : <View style={styles.emptyCircle} />}
    </Pressable>
  );
}

function SwitchRow({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: ReactNode;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchLead}>
        <View style={styles.detailIcon}>{icon}</View>
        <Text style={styles.switchLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D7DCE5", true: palette.greenLine }}
        thumbColor={value ? palette.green : "#FFFFFF"}
        ios_backgroundColor="#D7DCE5"
      />
    </View>
  );
}

function SegmentedOptions<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmentedWrap}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[styles.segmentedButton, value === option.value && styles.segmentedButtonActive]}
          onPress={() => onChange(option.value)}
        >
          <Text style={[styles.segmentedText, value === option.value && styles.segmentedTextActive]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function StatusBadge({ status }: { status: CourierDocument["status"] | CourierSupportTicket["status"] }) {
  const statusConfig = getStatusConfig(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: statusConfig.background }]}>
      <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
    </View>
  );
}

function LoadingCard({ text }: { text: string }) {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator color={palette.green} />
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );
}

function EmptyText({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function hasProfileLocation(profile: CourierProfile | null) {
  return Number.isFinite(Number(profile?.current_latitude)) && Number.isFinite(Number(profile?.current_longitude));
}

function formatDate(value?: string | null) {
  if (!value) {
    return "N/A";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(",", " •");
}

function documentLabel(document: CourierDocument) {
  return (
    {
      id_card: "Carte de identitate",
      driving_license: "Permis de conducere",
      vehicle_registration: "Certificat vehicul",
      insurance: "Asigurare",
    }[document.document_type] ?? document.document_type_label
  );
}

function getStatusConfig(status: CourierDocument["status"] | CourierSupportTicket["status"]) {
  return (
    {
      missing: { label: "Lipsă", background: "#F1F4F8", color: palette.muted },
      pending: { label: "În verificare", background: "#FFF6DC", color: "#A46B00" },
      approved: { label: "Aprobat", background: palette.greenSoft, color: palette.green },
      rejected: { label: "Respins", background: "#FFE9E7", color: palette.red },
      open: { label: "Deschis", background: palette.greenSoft, color: palette.green },
      in_progress: { label: "În lucru", background: "#FFF6DC", color: "#A46B00" },
      closed: { label: "Închis", background: "#F1F4F8", color: palette.muted },
    }[status] ?? { label: status, background: "#F1F4F8", color: palette.muted }
  );
}

const palette = {
  background: "#FFFFFF",
  ink: "#121827",
  muted: "#647084",
  softText: "#8A94A7",
  line: "#E8ECF2",
  green: "#17B65A",
  greenSoft: "#ECFBF3",
  greenLine: "#BDEFD4",
  red: "#FF3B30",
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flexGrow: 1,
    backgroundColor: palette.background,
    paddingHorizontal: 18,
    gap: 14,
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: palette.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.background,
    padding: 18,
    gap: 14,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.background,
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: palette.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  detailValue: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  fieldWrap: {
    gap: 7,
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    color: palette.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    paddingHorizontal: 14,
    backgroundColor: "#FAFBFC",
  },
  inputMultiline: {
    paddingTop: 13,
    paddingBottom: 13,
  },
  actionButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: palette.green,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  actionButtonCompact: {
    minHeight: 44,
    alignSelf: "flex-start",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.48,
  },
  balanceHero: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.greenLine,
    backgroundColor: palette.greenSoft,
    padding: 20,
    gap: 5,
  },
  balanceLabel: {
    color: palette.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  balanceAmount: {
    color: palette.green,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "900",
  },
  balanceHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statTile: {
    width: "48.5%",
    minHeight: 86,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
    justifyContent: "center",
    gap: 6,
  },
  statTileValue: {
    color: palette.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  statTileLabel: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  compactRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 12,
  },
  compactRowText: {
    flex: 1,
    minWidth: 0,
  },
  compactRowTitle: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },
  compactRowMeta: {
    color: palette.softText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  compactRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  successValue: {
    color: palette.green,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
  },
  optionList: {
    gap: 12,
  },
  selectableRow: {
    minHeight: 82,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.background,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectableRowSelected: {
    borderColor: palette.greenLine,
    backgroundColor: palette.greenSoft,
  },
  selectableText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  selectableTitle: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  selectableDescription: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  emptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: palette.line,
  },
  documentCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    gap: 12,
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  documentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: palette.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  documentTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  documentTitle: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  documentMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  documentNote: {
    color: palette.red,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  statusBadge: {
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "900",
  },
  switchRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchLabel: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  segmentedWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segmentedButton: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedButtonActive: {
    borderColor: palette.greenLine,
    backgroundColor: palette.greenSoft,
  },
  segmentedText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  segmentedTextActive: {
    color: palette.green,
  },
  helpCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    gap: 9,
  },
  helpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  helpTitle: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  helpBody: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  contactCard: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.greenLine,
    backgroundColor: palette.greenSoft,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  contactText: {
    flex: 1,
    minWidth: 0,
  },
  contactTitle: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  contactMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  ticketRow: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 12,
    gap: 6,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  ticketSubject: {
    flex: 1,
    color: palette.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },
  ticketMessage: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  loadingCard: {
    minHeight: 94,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  emptyText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    paddingTop: 8,
  },
});
