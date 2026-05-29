import { createStackNavigator } from "@react-navigation/stack";
import { ChevronLeft } from "lucide-react-native";
import { Pressable } from "react-native";

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
        options={({ navigation, route }) => ({
          headerShown: true,
          title: route.params.order.restaurant_name,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background, height: 50 },
          headerTitleStyle: { color: colors.text, fontSize: 17, fontWeight: "600" },
          headerTintColor: colors.text,
          headerBackTitleVisible: false,
          gestureEnabled: true,
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ marginLeft: 2, padding: 4 }}>
              <ChevronLeft size={26} color={colors.text} strokeWidth={2.4} />
            </Pressable>
          ),
          cardStyle: { backgroundColor: colors.background },
        })}
      />
    </Stack.Navigator>
  );
}
