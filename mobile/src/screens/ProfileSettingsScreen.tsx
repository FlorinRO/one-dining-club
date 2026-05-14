import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Globe, LogOut, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authApi } from "../api/authApi";
import { useI18n } from "../i18n/useI18n";
import { ProfileStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { AppLanguage, usePreferencesStore } from "../store/preferencesStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileSettings">;
export function ProfileSettingsScreen({ navigation }: Props) {
  const { language, t } = useI18n();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const isGuest = useAuthStore((state) => state.isGuest);
  const logout = useAuthStore((state) => state.logout);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);

  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(t("settings.logout.title"), t("settings.logout.message"), [
      { text: t("settings.cancel"), style: "cancel" },
      {
        text: t("settings.logout"),
        style: "destructive",
        onPress: async () => {
          setLogoutLoading(true);
          try {
            if (refreshToken && !isGuest) {
              await authApi.logout(refreshToken);
            }
          } catch {
            // Clear local session even if backend token is already invalid.
          } finally {
            setLogoutLoading(false);
            logout();
          }
        },
      },
    ]);
  };

  const chooseLanguage = (value: AppLanguage) => setLanguage(value);

  const openLanguagePicker = () => {
    Alert.alert(t("settings.language.alert.title"), t("settings.language.alert.message"), [
      { text: t("settings.language.ro"), onPress: () => chooseLanguage("ro") },
      { text: t("settings.language.en"), onPress: () => chooseLanguage("en") },
      { text: t("settings.cancel"), style: "cancel" },
    ]);
  };

  const requestDeleteAccount = () => {
    Alert.alert(
      t("settings.delete.title"),
      t("settings.delete.message"),
      [
        { text: t("settings.cancel"), style: "cancel" },
        { text: t("settings.logout"), style: "destructive", onPress: handleLogout },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
            <X size={24} stroke={colors.text} />
          </Pressable>
          <Text style={styles.title}>{t("settings.title")}</Text>
        </View>

        <View style={styles.list}>
          <Pressable style={styles.row} onPress={openLanguagePicker}>
            <Globe size={22} color={colors.text} strokeWidth={2.4} />
            <Text style={styles.rowTitle}>
              {t("settings.language")}: {language === "ro" ? t("settings.language.ro") : t("settings.language.en")}
            </Text>
          </Pressable>

          <Pressable style={styles.row} onPress={handleLogout} disabled={logoutLoading}>
            <LogOut size={22} color={colors.text} strokeWidth={2.4} />
            <Text style={styles.rowTitle}>{logoutLoading ? t("settings.loggingOut") : t("settings.logout")}</Text>
          </Pressable>

          <Pressable style={styles.row} onPress={requestDeleteAccount}>
            <Trash2 size={22} color={colors.redDark} strokeWidth={2.4} />
            <Text style={[styles.rowTitle, styles.destructive]}>{t("settings.delete")}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  header: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  closeButton: {
    position: "absolute",
    left: 0,
    top: 8,
    padding: 4,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.text,
  },
  list: {
    gap: 16,
  },
  row: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
  },
  destructive: {
    color: colors.redDark,
  },
});
