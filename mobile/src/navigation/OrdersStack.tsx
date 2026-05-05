import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { OrdersStackParamList } from "./types";
import { OrderDetailsScreen } from "../screens/OrderDetailsScreen";
import { OrdersScreen } from "../screens/OrdersScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export function OrdersStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="OrdersHome" component={OrdersScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
    </Stack.Navigator>
  );
}

