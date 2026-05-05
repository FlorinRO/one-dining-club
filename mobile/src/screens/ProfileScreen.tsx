import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LogOut, MapPin, UserRound } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ProfileStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

export function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <UserRound stroke={colors.background} size={30} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user?.full_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Client"}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>
        <Pressable onPress={() => navigation.navigate("Address")} style={styles.menuItem}>
          <View style={styles.menuIcon}>
            <MapPin size={20} stroke={colors.lime} />
          </View>
          <Text style={styles.menuText}>Adrese livrare</Text>
        </Pressable>
        <PrimaryButton title="Logout" variant="ghost" icon={<LogOut size={19} stroke={colors.text} />} onPress={logout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 14,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
  },
  card: {
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  email: {
    marginTop: 4,
    color: colors.muted,
    fontWeight: "700",
  },
  menuItem: {
    height: 62,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
});

