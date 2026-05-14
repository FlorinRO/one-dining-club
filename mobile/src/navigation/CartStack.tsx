import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CartStackParamList } from "./types";
import { CartScreen } from "../screens/CartScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<CartStackParamList>();

export function CartStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="CartHome" component={CartScreen} />
    </Stack.Navigator>
  );
}
