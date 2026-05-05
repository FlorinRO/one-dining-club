import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, ListOrdered, Search, ShoppingBag, UserRound } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CartStack } from "./CartStack";
import { HomeStack } from "./HomeStack";
import { MainTabsParamList } from "./types";
import { OrdersStack } from "./OrdersStack";
import { ProfileStack } from "./ProfileStack";
import { SearchScreen } from "../screens/SearchScreen";
import { useCartStore } from "../store/cartStore";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const insets = useSafeAreaInsets();
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 62 + insets.bottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "800",
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home stroke={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => <Search stroke={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartStack}
        options={{
          title: "Cart",
          tabBarBadge: cartCount || undefined,
          tabBarBadgeStyle: { backgroundColor: colors.red, color: colors.white },
          tabBarIcon: ({ color, size }) => <ShoppingBag stroke={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStack}
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => <ListOrdered stroke={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <UserRound stroke={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
