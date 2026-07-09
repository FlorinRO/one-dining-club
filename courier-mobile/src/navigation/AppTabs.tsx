import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Activity, Bike, ClipboardList, UserCircle2 } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

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
        animation: "shift",
        lazy: false,
        sceneStyle: {
          backgroundColor: colors.white,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: "rgba(17,17,17,0.08)",
          elevation: 10,
          shadowColor: "#111111",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          zIndex: 1,
          height: 88,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: "rgba(17,17,17,0.5)",
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Available"
        component={AvailableOrdersScreen}
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
              <Bike color={color} size={size} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Operations"
        component={OperationsScreen}
        options={{
          title: "Ops",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
              <Activity color={color} size={size} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Deliveries"
        component={DeliveriesScreen}
        options={{
          title: "My Runs",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
              <ClipboardList color={color} size={size} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
              <UserCircle2 color={color} size={size} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    minWidth: 44,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconWrapFocused: {
    backgroundColor: colors.cardSoft,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
});
