import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import type { ComponentType, ReactNode } from "react";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Camera,
  CarFront,
  ChevronRight,
  CircleHelp,
  Headphones,
  LogOut,
  Phone,
  Star,
  User,
} from "lucide-react-native";

import { authApi } from "../api/authApi";
import { courierApi } from "../api/courierApi";
import { unregisterCurrentPushDevice } from "../lib/notifications";
import { RootStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { useCourierStore } from "../store/courierStore";

const avatarSource = require("../../assets/profile-avatar.png");

type ProfileIcon = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
  fill?: string;
}>;

type ProfileRouteName =
  | "ProfilePersonal"
  | "ProfileVehicle"
  | "ProfileHelpCenter"
  | "ProfileSupport";

const accountItems: Array<{ label: string; icon: ProfileIcon; route: ProfileRouteName }> = [
  { label: "Date personale", icon: User, route: "ProfilePersonal" },
  { label: "Vehicul", icon: CarFront, route: "ProfileVehicle" },
];

const supportItems: Array<{ label: string; icon: ProfileIcon; route: ProfileRouteName }> = [
  { label: "Centru de ajutor", icon: CircleHelp, route: "ProfileHelpCenter" },
  { label: "Contactează suportul", icon: Headphones, route: "ProfileSupport" },
];

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);
  const resetCourierState = useCourierStore((state) => state.reset);
  const profile = useCourierStore((state) => state.profile);
  const operationsSummary = useCourierStore((state) => state.operationsSummary);
  const profileLoading = useCourierStore((state) => state.profileLoading);
  const operationsLoading = useCourierStore((state) => state.operationsLoading);
  const refreshAll = useCourierStore((state) => state.refreshAll);
  const refreshProfile = useCourierStore((state) => state.refreshProfile);

  const displayName = user?.full_name || profile?.full_name || user?.email || profile?.email || "Curier YUMZY";
  const displayPhone = profile?.phone || user?.phone || "Telefon neconfigurat";
  const avatarImageSource = avatarPreviewUri ? { uri: avatarPreviewUri } : profile?.avatar_url ? { uri: profile.avatar_url } : avatarSource;
  const completedTotal = operationsSummary?.completed_total ?? profile?.completed_deliveries_total ?? 0;
  const ratingCount = profile?.rating_count ?? 0;
  const ratingAverage = Number(profile?.rating_average ?? 0);
  const isInitialLoading = (!profile || !operationsSummary) && (profileLoading || operationsLoading);
  const refreshing = profileLoading || operationsLoading;

  useFocusEffect(
    useCallback(() => {
      void refreshAll().catch(() => undefined);
    }, [refreshAll]),
  );

  const handleLogout = async () => {
    if (refreshToken) {
      void authApi.logout(refreshToken).catch(() => undefined);
    }
    await unregisterCurrentPushDevice();
    resetCourierState();
    logout();
  };

  const handleChangeAvatar = async () => {
    if (avatarUploading) {
      return;
    }

    setAvatarUploading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permisiune necesară", "Permite accesul la galerie pentru a schimba avatarul.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
      });

      const asset = result.canceled ? null : result.assets?.[0];
      if (!asset?.uri) {
        return;
      }

      setAvatarPreviewUri(asset.uri);
      await courierApi.uploadProfileAvatar({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      await refreshProfile();
      Alert.alert("Avatar actualizat", "Poza de profil a fost salvată.");
    } catch (error) {
      console.warn("Could not update courier avatar", error);
      setAvatarPreviewUri(null);
      Alert.alert("Eroare", "Nu am putut actualiza avatarul.");
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 18, 36) }]}
        refreshControl={<RefreshControl tintColor={palette.green} refreshing={refreshing} onRefresh={refreshAll} />}
      >
        <Text style={styles.title}>Profil</Text>

        {isInitialLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={palette.green} />
            <Text style={styles.loadingText}>Se încarcă profilul...</Text>
          </View>
        ) : null}

        <View style={styles.identityRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Schimbă avatarul"
            style={styles.avatarButton}
            onPress={handleChangeAvatar}
            disabled={avatarUploading}
          >
            <Image source={avatarImageSource} style={styles.avatar} />
            <View style={styles.avatarAction}>
              {avatarUploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Camera color="#FFFFFF" size={17} strokeWidth={2.6} />
              )}
            </View>
          </Pressable>
          <Pressable style={styles.identityText} onPress={() => navigation.navigate("ProfilePersonal")}>
            <Text style={styles.name}>{displayName}</Text>
            <View style={styles.metaRow}>
              <Phone color={palette.muted} size={14} strokeWidth={2.4} />
              <Text style={styles.metaText}>{displayPhone}</Text>
            </View>
            <View style={styles.metaRow}>
              <Star color={palette.star} fill={palette.star} size={15} strokeWidth={2.2} />
              {ratingCount > 0 ? (
                <>
                  <Text style={styles.metaText}>{ratingAverage.toFixed(1).replace(".", ",")}</Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.metaText}>{ratingCount} evaluări</Text>
                </>
              ) : (
                <Text style={styles.metaText}>{completedTotal} curse finalizate</Text>
              )}
            </View>
          </Pressable>
          <Pressable hitSlop={10} onPress={() => navigation.navigate("ProfilePersonal")}>
            <ChevronRight color={palette.ink} size={22} strokeWidth={2.4} />
          </Pressable>
        </View>

        <Section title="Contul meu">
          {accountItems.map((item, index) => (
            <MenuRow
              key={item.label}
              item={item}
              showDivider={index < accountItems.length - 1}
              onPress={() => navigation.navigate(item.route)}
            />
          ))}
        </Section>

        <Section title="Alte opțiuni">
          {supportItems.map((item, index) => (
            <MenuRow
              key={item.label}
              item={item}
              showDivider={index < supportItems.length - 1}
              onPress={() => navigation.navigate(item.route)}
            />
          ))}
          <MenuRow item={{ label: "Deconectare", icon: LogOut }} destructive onPress={() => void handleLogout()} />
        </Section>

        <Text style={styles.version}>YUMZY Courier v1.3.0</Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuList}>{children}</View>
    </View>
  );
}

function MenuRow({
  item,
  showDivider = false,
  destructive = false,
  onPress,
}: {
  item: { label: string; icon: ProfileIcon };
  showDivider?: boolean;
  destructive?: boolean;
  onPress?: () => void;
}) {
  const tint = destructive ? palette.red : palette.ink;

  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <item.icon color={tint} size={22} strokeWidth={2.15} />
      <View style={[styles.menuLabelWrap, showDivider && styles.rowDivider]}>
        <Text style={[styles.menuText, destructive && styles.destructiveText]}>{item.label}</Text>
        <ChevronRight color={palette.ink} size={23} strokeWidth={2.25} />
      </View>
    </Pressable>
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
  star: "#FDBA12",
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
    paddingBottom: 118,
    gap: 14,
  },
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    textAlign: "center",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 14,
    paddingBottom: 6,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarAction: {
    position: "absolute",
    right: 0,
    bottom: 3,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: palette.background,
    backgroundColor: palette.green,
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: {
    flex: 1,
    gap: 6,
  },
  name: {
    color: palette.ink,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  metaText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  dot: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  loadingCard: {
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.background,
    paddingHorizontal: 20,
    paddingTop: 21,
    paddingBottom: 17,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
  },
  menuList: {
    paddingTop: 14,
  },
  menuRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  menuLabelWrap: {
    minHeight: 50,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  menuText: {
    color: palette.ink,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "500",
  },
  destructiveText: {
    color: palette.red,
  },
  version: {
    color: palette.softText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    textAlign: "center",
    paddingTop: 2,
  },
});
