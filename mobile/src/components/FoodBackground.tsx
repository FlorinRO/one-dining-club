import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, View } from "react-native";

import {
  BURGER_BACKGROUND_IMAGE,
  FOOD_BACKGROUND_BLUR_RADIUS,
  FOOD_BACKGROUND_GRADIENT_COLORS,
  FOOD_BACKGROUND_GRADIENT_LOCATIONS,
} from "../theme/foodBackground";

type Props = {
  topOffset?: number;
};

export function FoodBackground({ topOffset = 0 }: Props) {
  return (
    <>
      <View style={[styles.imageFrame, { top: topOffset }]}>
        <Image
          source={BURGER_BACKGROUND_IMAGE}
          style={styles.image}
          resizeMode="contain"
          blurRadius={FOOD_BACKGROUND_BLUR_RADIUS + 2}
        />
      </View>
      <View pointerEvents="none" style={[styles.overlay, { top: topOffset }]} />
      <LinearGradient
        pointerEvents="none"
        colors={FOOD_BACKGROUND_GRADIENT_COLORS}
        locations={FOOD_BACKGROUND_GRADIENT_LOCATIONS}
        style={[StyleSheet.absoluteFillObject, { top: topOffset }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  imageFrame: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "250%",
    height: "250%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
});
