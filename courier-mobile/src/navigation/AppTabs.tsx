import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Activity, Bike, ClipboardList, UserCircle2 } from "lucide-react-native";
import { Easing, StyleSheet } from "react-native";

import { AvailableOrdersScreen } from "../screens/AvailableOrdersScreen";
import { DeliveriesScreen } from "../screens/DeliveriesScreen";
import { OperationsScreen } from "../screens/OperationsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { colors } from "../theme/colors";
import { AppTabParamList } from "./types";

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        transitionSpec: {
          animation: "timing",
          config: {
            duration: 340,
            easing: Easing.out(Easing.cubic),
          },
        },
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            opacity: current.progress.interpolate({
              inputRange: [-1, -0.2, 0, 0.2, 1],
              outputRange: [0.95, 0.988, 1, 0.988, 0.95],
            }),
            borderRadius: current.progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [28, 0, 28],
            }),
            shadowColor: "#000000",
            shadowOpacity: current.progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0.26, 0, 0.26],
            }),
            shadowRadius: current.progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [28, 0, 28],
            }),
            shadowOffset: {
              width: 0,
              height: 10,
            },
            elevation: current.progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [24, 0, 24],
            }),
            overflow: "hidden",
            transform: [
              {
                scale: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [0.6, 1, 0.6],
                }),
              },
            ],
          },
        }),
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 84,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: "rgba(255,255,255,0.72)",
        tabBarBackground: () => (
          <LinearGradient
            colors={["rgba(17,17,17,0)", "rgba(17,17,17,0.09)", "rgba(17,17,17,0.22)", "rgba(17,17,17,0.46)", "rgba(17,17,17,0.9)"]}
            locations={[0, 0.22, 0.5, 0.76, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.tabBarBackground}
          />
        ),
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Available"
        component={AvailableOrdersScreen}
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Bike color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Operations"
        component={OperationsScreen}
        options={{
          title: "Ops",
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Deliveries"
        component={DeliveriesScreen}
        options={{
          title: "My Runs",
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <UserCircle2 color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    top: -400,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
});
