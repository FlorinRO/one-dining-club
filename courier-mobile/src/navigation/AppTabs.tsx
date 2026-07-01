import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Bike, ClipboardList, UserCircle2 } from "lucide-react-native";

import { AvailableOrdersScreen } from "../screens/AvailableOrdersScreen";
import { DeliveriesScreen } from "../screens/DeliveriesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { colors } from "../theme/colors";
import { AppTabParamList } from "./types";

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#121212",
          borderTopColor: "rgba(255,255,255,0.08)",
          height: 84,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: "rgba(255,255,255,0.54)",
      }}
    >
      <Tab.Screen
        name="Available"
        component={AvailableOrdersScreen}
        options={{
          title: "Live Board",
          tabBarIcon: ({ color, size }) => <Bike color={color} size={size} />,
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
