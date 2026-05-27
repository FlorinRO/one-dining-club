import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SearchStackParamList } from "./types";
import { ProductDetailsModal } from "../screens/ProductDetailsModal";
import { RestaurantDetailsScreen } from "../screens/RestaurantDetailsScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<SearchStackParamList>();

export function SearchStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="SearchHome" component={SearchScreen} />
      <Stack.Screen
        name="RestaurantDetails"
        component={RestaurantDetailsScreen}
        options={{ animation: "fade" }}
      />
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsModal}
        options={{ animation: "slide_from_right" }}
      />
    </Stack.Navigator>
  );
}
