import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationState, PartialState, useNavigation, useNavigationState } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Home, ListOrdered, Search, UserRound } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatingCartBar } from "../components/FloatingCartBar";
import { HomeStack } from "./HomeStack";
import { MainTabsParamList } from "./types";
import { OrdersStack } from "./OrdersStack";
import { ProfileStack } from "./ProfileStack";
import { SearchScreen } from "../screens/SearchScreen";
import { useI18n } from "../i18n/useI18n";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { t } = useI18n();
  const rootState = useNavigationState((state) => state);
  const activeRouteName = getDeepActiveRouteName(rootState);
  const hideFloatingCart = activeRouteName === "CartHome" || activeRouteName === "CartFlow";
  const hideBottomBar = activeRouteName === "CartHome" || activeRouteName === "CartFlow";

  return (
    <View style={styles.container}>
      <Tab.Navigator
        id="MainTabs"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: hideBottomBar ? "none" : "flex",
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
            title: t("tabs.home", "Home"),
            tabBarIcon: ({ color, size }) => <Home stroke={color} size={size - 2} />,
          }}
        />
        <Tab.Screen
          name="SearchTab"
          component={SearchScreen}
          options={{
            title: t("tabs.search", "Search"),
            tabBarIcon: ({ color, size }) => <Search stroke={color} size={size - 2} />,
          }}
        />
        <Tab.Screen
          name="OrdersTab"
          component={OrdersStack}
          options={{
            title: t("tabs.orders", "Orders"),
            tabBarIcon: ({ color, size }) => <ListOrdered stroke={color} size={size - 2} />,
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStack}
          options={{
            title: t("tabs.profile", "Profile"),
            tabBarIcon: ({ color, size }) => <UserRound stroke={color} size={size - 2} />,
          }}
        />
      </Tab.Navigator>
      {!hideFloatingCart ? (
        <FloatingCartBar
          onPress={() =>
            navigation.navigate("MainTabs", {
              screen: "HomeTab",
              params: {
                screen: "CartFlow",
                params: { screen: "CartHome" },
              },
            })
          }
        />
      ) : null}
    </View>
  );
}

function getDeepActiveRouteName(state: NavigationState | PartialState<NavigationState> | undefined): string | undefined {
  if (!state || !state.routes?.length) return undefined;
  const route = state.routes[state.index ?? 0] as {
    name?: string;
    state?: NavigationState | PartialState<NavigationState>;
  };
  if (route.state) return getDeepActiveRouteName(route.state);
  return route.name;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
