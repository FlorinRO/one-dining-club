import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Bell,
  ChevronRight,
  CreditCard,
  HelpCircle,
  LogOut,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";
import { ReactElement } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ProfileStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

type MenuItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: ReactElement;
  onPress: () => void;
  danger?: boolean;
};

export function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const displayName = user?.full_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Client";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";

  const goSoon = (label: string) => {
    Alert.alert("În curând", `${label} va fi disponibil în curând.`);
  };

  const items: MenuItem[] = [
    {
      key: "addresses",
      title: "Adrese livrare",
      subtitle: "Acasă, birou și adrese favorite",
      icon: <MapPin size={19} color={colors.text} strokeWidth={2} />,
      onPress: () => navigation.navigate("Address"),
    },
    {
      key: "payments",
      title: "Metode de plată",
      subtitle: "Carduri și opțiuni de plată",
      icon: <CreditCard size={19} color={colors.text} strokeWidth={2} />,
      onPress: () => goSoon("Metode de plată"),
    },
    {
      key: "notifications",
      title: "Notificări",
      subtitle: "Preferințe pentru comenzi și oferte",
      icon: <Bell size={19} color={colors.text} strokeWidth={2} />,
      onPress: () => goSoon("Notificări"),
    },
    {
      key: "security",
      title: "Securitate cont",
      subtitle: "Parolă, sesiuni și date personale",
      icon: <ShieldCheck size={19} color={colors.text} strokeWidth={2} />,
      onPress: () => goSoon("Securitate cont"),
    },
    {
      key: "help",
      title: "Ajutor",
      subtitle: "Centru de suport și FAQ",
      icon: <HelpCircle size={19} color={colors.text} strokeWidth={2} />,
      onPress: () => goSoon("Ajutor"),
    },
  ];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Contul meu</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email ?? "client@one-dining.club"}
            </Text>
          </View>
          </View>

        </View>

        <View style={styles.menuCard}>
          {items.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.menuRow,
                index !== items.length - 1 && styles.menuRowBorder,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.menuIconWrap, item.danger && styles.menuIconWrapDanger]}>{item.icon}</View>
              <View style={styles.menuCopy}>
                <Text style={[styles.menuTitle, item.danger && styles.menuTitleDanger]}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={19} color={colors.muted} strokeWidth={2.2} />
            </Pressable>
          ))}
        </View>

        <PrimaryButton title="Delogare" variant="ghost" icon={<LogOut size={18} stroke={colors.text} />} onPress={logout} />

        <View style={styles.bottomNote}>
          <UserRound size={15} color={colors.muted} strokeWidth={2.1} />
          <Text style={styles.bottomNoteText}>One Dining Club · v1.0</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 10,
    paddingBottom: 120,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
  },
  identity: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  email: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  menuCard: {
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  menuRow: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconWrapDanger: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  menuCopy: {
    flex: 1,
  },
  menuTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  menuTitleDanger: {
    color: colors.red,
  },
  menuSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.88,
  },
  bottomNote: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bottomNoteText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
});
