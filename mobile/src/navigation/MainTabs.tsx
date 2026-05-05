import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, ListOrdered, Search, UserRound } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HomeStack } from "./HomeStack";
import { MainTabsParamList } from "./types";
import { OrdersStack } from "./OrdersStack";
import { ProfileStack } from "./ProfileStack";
import { SearchScreen } from "../screens/SearchScreen";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 46 + insets.bottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 6,
          paddingBottom: 2 + insets.bottom,
        },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home stroke={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => <Search stroke={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStack}
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => <ListOrdered stroke={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <UserRound stroke={color} size={size - 2} />,
        }}
      />
    </Tab.Navigator>
  );
}
