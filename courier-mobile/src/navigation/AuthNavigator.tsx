import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";

import { AuthVideoBackground } from "../components/AuthVideoBackground";
import { LoginScreen } from "../screens/LoginScreen";
import { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <View style={styles.container}>
      <AuthVideoBackground />
      <View style={styles.navigator}>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  navigator: {
    flex: 1,
    zIndex: 10,
    elevation: 10,
  },
});
