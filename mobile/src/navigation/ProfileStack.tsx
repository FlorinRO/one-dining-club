import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ProfileStackParamList } from "./types";
import { AddressScreen } from "../screens/AddressScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ProfileEditScreen } from "../screens/ProfileEditScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="Address" component={AddressScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
    </Stack.Navigator>
  );
}

