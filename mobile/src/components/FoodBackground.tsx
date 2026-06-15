import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import {
  FOOD_BACKGROUND_GRADIENT_COLORS,
  FOOD_BACKGROUND_GRADIENT_LOCATIONS,
} from "../theme/foodBackground";

type Props = {
  topOffset?: number;
};

export function FoodBackground({ topOffset = 0 }: Props) {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={FOOD_BACKGROUND_GRADIENT_COLORS}
        locations={FOOD_BACKGROUND_GRADIENT_LOCATIONS}
        style={[StyleSheet.absoluteFillObject, { top: topOffset }]}
      />
      <View pointerEvents="none" style={[styles.baseTint, { top: topOffset }]} />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.01)", "rgba(255,255,255,0)"]}
        locations={[0, 0.28, 1]}
        style={[StyleSheet.absoluteFillObject, { top: topOffset }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.008)", "rgba(255,255,255,0.035)"]}
        locations={[0, 0.78, 1]}
        style={[StyleSheet.absoluteFillObject, { top: topOffset }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  baseTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,8,10,0.78)",
  },
});
