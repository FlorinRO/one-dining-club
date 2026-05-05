import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HomeStackParamList } from "./types";
import { HomeScreen } from "../screens/HomeScreen";
import { ProductDetailsModal } from "../screens/ProductDetailsModal";
import { RestaurantDetailsScreen } from "../screens/RestaurantDetailsScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="RestaurantDetails" component={RestaurantDetailsScreen} />
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsModal}
        options={{ presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}

