import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ImageBackground, StyleSheet, Text, View } from "react-native";

import { AuthStackParamList } from "../navigation/types";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);

  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1400&auto=format&fit=crop",
      }}
      style={styles.background}
      imageStyle={styles.image}
    >
      <View style={styles.overlay} />
      <View style={styles.content}>
        <View>
          <Text style={styles.brand}>One Dining Club</Text>
          <Text style={styles.title}>Food delivery pentru seri bune si pranzuri rapide.</Text>
        </View>
        <View style={styles.actions}>
          <PrimaryButton title="Intra in cont" onPress={() => navigation.navigate("Login")} />
          <PrimaryButton title="Creeaza cont" variant="ghost" onPress={() => navigation.navigate("Register")} />
          <PrimaryButton title="Continua demo" variant="lime" onPress={continueAsGuest} />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  image: {
    opacity: 0.78,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 82,
    paddingBottom: 42,
  },
  brand: {
    color: colors.lime,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    marginTop: 14,
    color: colors.text,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "900",
  },
  actions: {
    gap: 12,
  },
});

