import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Globe, LogOut, Trash2, X } from "lucide-react-native";
import { AxiosError } from "axios";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { authApi } from "../api/authApi";
import { FoodBackground } from "../components/FoodBackground";
import { useI18n } from "../i18n/useI18n";
import { unregisterCurrentPushDevice } from "../lib/notifications";
import { ProfileStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { AppLanguage, usePreferencesStore } from "../store/preferencesStore";
import { showAppAlert } from "../store/uiStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileSettings">;
const DESTRUCTIVE_RED = "#DC2626";

function extractDeleteAccountError(error: unknown, fallback: string) {
  if (!(error instanceof AxiosError)) return fallback;

  const data = error.response?.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    const detail = (data as Record<string, unknown>).detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
  }

  return fallback;
}

export function ProfileSettingsScreen({ navigation }: Props) {
  const { language, t } = useI18n();
  const insets = useSafeAreaInsets();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const isGuest = useAuthStore((state) => state.isGuest);
  const logout = useAuthStore((state) => state.logout);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);

  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleLogout = () => {
    showAppAlert(t("settings.logout.title"), t("settings.logout.message"), [
      { text: t("settings.cancel"), style: "cancel" },
      {
        text: t("settings.logout"),
        style: "destructive",
        onPress: async () => {
          setLogoutLoading(true);
          try {
            if (refreshToken && !isGuest) {
              await unregisterCurrentPushDevice();
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
    showAppAlert(t("settings.language.alert.title"), t("settings.language.alert.message"), [
      { text: t("settings.language.ro"), onPress: () => chooseLanguage("ro") },
      { text: t("settings.language.en"), onPress: () => chooseLanguage("en") },
      { text: t("settings.cancel"), style: "cancel" },
    ]);
  };

  const requestDeleteAccount = () => {
    showAppAlert(
      t("settings.delete.title"),
      t("settings.delete.message"),
      [
        { text: t("settings.cancel"), style: "cancel" },
        {
          text: t("settings.delete.confirm"),
          style: "destructive",
          onPress: async () => {
            setDeleteLoading(true);
            try {
              await unregisterCurrentPushDevice();
              await authApi.deleteMe();
              logout();
            } catch (error) {
              console.error("Delete account failed", {
                message: error instanceof AxiosError ? error.message : String(error),
                status: error instanceof AxiosError ? error.response?.status : undefined,
                response: error instanceof AxiosError ? error.response?.data : undefined,
              });
              setDeleteLoading(false);
              showAppAlert(
                t("settings.delete.error.title"),
                extractDeleteAccountError(error, t("settings.delete.error.message")),
                undefined,
                { tone: "error" },
              );
              return;
            }
            setDeleteLoading(false);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.screen}>
        <FoodBackground topOffset={-insets.top} />
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

            <Pressable style={[styles.row, styles.deleteRow]} onPress={requestDeleteAccount} disabled={deleteLoading}>
              <Trash2 size={22} color={DESTRUCTIVE_RED} strokeWidth={2.4} />
              <Text style={[styles.rowTitle, styles.destructive]}>{deleteLoading ? t("settings.deleting") : t("settings.delete")}</Text>
            </Pressable>
          </View>
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
  screen: {
    flex: 1,
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
  deleteRow: {
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  rowTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
  },
  destructive: {
    color: DESTRUCTIVE_RED,
  },
});
