import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HomeStackParamList } from "./types";
import { CartStack } from "./CartStack";
import { DeliveryAddressScreen } from "../screens/DeliveryAddressScreen";
import { DeliveryAddressMapScreen } from "../screens/DeliveryAddressMapScreen";
import { FavoritesScreen } from "../screens/FavoritesScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ProductDetailsModal } from "../screens/ProductDetailsModal";
import { RestaurantDetailsScreen } from "../screens/RestaurantDetailsScreen";
import { SectionRestaurantsScreen } from "../screens/SectionRestaurantsScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="DeliveryAddress"
        component={DeliveryAddressScreen}
        options={{ animation: "fade" }}
      />
      <Stack.Screen name="DeliveryAddressMap" component={DeliveryAddressMapScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="SectionRestaurants" component={SectionRestaurantsScreen} />
      <Stack.Screen name="RestaurantDetails" component={RestaurantDetailsScreen} />
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsModal}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen name="CartFlow" component={CartStack} />
    </Stack.Navigator>
  );
}
