import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationState, PartialState, useNavigation, useNavigationState } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Home, ListOrdered, Search, UserRound } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatingCartBar } from "../components/FloatingCartBar";
import { HomeStack } from "./HomeStack";
import { MainTabsParamList } from "./types";
import { OrdersStack } from "./OrdersStack";
import { ProfileStack } from "./ProfileStack";
import { SearchStack } from "./SearchStack";
import { useI18n } from "../i18n/useI18n";

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { t } = useI18n();
  const rootState = useNavigationState((state) => state);
  const activeRouteName = getDeepActiveRouteName(rootState);
  const isFeedRoute =
    activeRouteName === undefined ||
    activeRouteName === "MainTabs" ||
    activeRouteName === "Home" ||
    activeRouteName === "HomeTab";
  const hideFloatingCart =
    isFeedRoute ||
    activeRouteName === "CartHome" ||
    activeRouteName === "CartFlow" ||
    activeRouteName === "ProductDetails" ||
    activeRouteName === "DeliveryAddress" ||
    activeRouteName === "DeliveryAddressMap";
  const hideBottomBar =
    activeRouteName === "CartHome" ||
    activeRouteName === "CartFlow" ||
    activeRouteName === "ProductDetails" ||
    activeRouteName === "DeliveryAddress" ||
    activeRouteName === "DeliveryAddressMap";

  return (
    <View style={styles.container}>
      <Tab.Navigator
        id="MainTabs"
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
          animation: "fade",
          freezeOnBlur: false,
          tabBarStyle: {
            display: hideBottomBar ? "none" : "flex",
            height: 46 + insets.bottom,
            backgroundColor: "transparent",
            borderTopWidth: 0,
            borderTopColor: "transparent",
            elevation: 0,
            shadowOpacity: 0,
            position: "absolute",
            paddingTop: 6,
            paddingBottom: 2 + insets.bottom,
          },
          tabBarBackground: () => (
            isFeedRoute ? null : (
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(10,10,10,0.08)", "rgba(10,10,10,0.72)", "rgba(10,10,10,0.98)"]}
                locations={[0, 0.4, 1]}
                style={styles.tabBarFadeBackground}
              />
            )
          ),
          tabBarActiveTintColor: "#FFFFFF",
          tabBarInactiveTintColor: "#FFFFFF",
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
            title: t("tabs.home", "Feed"),
            tabBarIcon: ({ color, size }) => <Home stroke={color} size={size - 2} />,
          }}
        />
        <Tab.Screen
          name="SearchTab"
          component={SearchStack}
          options={{
            title: t("tabs.search", "Search"),
            tabBarIcon: ({ color, size }) => <Search stroke={color} size={size - 2} />,
          }}
        />
        <Tab.Screen
          name="OrdersTab"
          component={OrdersStack}
          options={{
            popToTopOnBlur: true,
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
          mode={isFeedRoute ? "compact" : "animated"}
          compactStyle={isFeedRoute ? "feed" : "default"}
          style={isFeedRoute ? { top: insets.top + 20, right: 14, left: undefined, bottom: undefined } : undefined}
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
  tabBarFadeBackground: {
    ...StyleSheet.absoluteFillObject,
    top: -18,
  },
});
