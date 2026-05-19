import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ProfileStackParamList } from "./types";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ProfileEditScreen } from "../screens/ProfileEditScreen";
import { ProfileInfoScreen } from "../screens/ProfileInfoScreen";
import { ProfileSettingsScreen } from "../screens/ProfileSettingsScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <Stack.Screen name="ProfileInfo" component={ProfileInfoScreen} />
    </Stack.Navigator>
  );
}
