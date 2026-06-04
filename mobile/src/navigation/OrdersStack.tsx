import { createStackNavigator } from "@react-navigation/stack";

import { OrdersStackParamList } from "./types";
import { OrderDetailsScreen } from "../screens/OrderDetailsScreen";
import { OrdersScreen } from "../screens/OrdersScreen";
import { colors } from "../theme/colors";

const Stack = createStackNavigator<OrdersStackParamList>();

export function OrdersStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="OrdersHome" component={OrdersScreen} />
      <Stack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
          cardStyle: { backgroundColor: colors.background },
        }}
      />
    </Stack.Navigator>
  );
}
