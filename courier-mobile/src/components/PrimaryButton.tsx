import { ReactNode, useEffect, useRef } from "react";
import { Animated, Pressable, StyleProp, StyleSheet, TextStyle, ViewStyle } from "react-native";

import { colors } from "../theme/colors";

type Props = {
  title?: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  flatEdges?: boolean;
  variant?: "primary" | "ghost" | "lime" | "queued";
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ title, onPress, disabled, icon, flatEdges = false, variant = "primary", style }: Props) {
  const queuedProgress = useRef(new Animated.Value(variant === "queued" ? 1 : 0)).current;
  const queuedPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(queuedProgress, {
      toValue: variant === "queued" ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [queuedProgress, variant]);

  useEffect(() => {
    if (variant !== "queued") {
      queuedPulse.stopAnimation();
      queuedPulse.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(queuedPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(queuedPulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
      ]),
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
      queuedPulse.stopAnimation();
    };
  }, [queuedPulse, variant]);

  const animatedButtonStyle = {
    backgroundColor: queuedProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.lime, colors.white],
    }),
    borderColor: queuedProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.lime, "rgba(168,235,79,0.96)"],
    }),
    shadowOpacity: queuedProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.34],
    }),
    shadowRadius: queuedProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 16],
    }),
  } satisfies Animated.WithAnimatedObject<ViewStyle>;

  const animatedQueuedPulseStyle = {
    shadowOpacity: queuedPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.24, 0.5],
    }),
    shadowRadius: queuedPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [22, 40],
    }),
    transform: [
      {
        scale: queuedPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.015],
        }),
      },
    ],
  } satisfies Animated.WithAnimatedObject<ViewStyle>;

  const animatedTextStyle = {
    color: queuedProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.black, colors.black],
    }),
  } satisfies Animated.WithAnimatedObject<TextStyle>;

  return (
    <Animated.View
      style={[
        styles.button,
        flatEdges && styles.buttonFlat,
        variant === "ghost" && styles.ghost,
        variant === "lime" && styles.lime,
        variant === "queued" && styles.queued,
        variant === "queued" && animatedButtonStyle,
        variant === "queued" && animatedQueuedPulseStyle,
        style,
      ]}
    >
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          flatEdges && styles.pressableFlat,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        {icon}
        {title ? (
          <Animated.Text
            style={[
              styles.text,
              variant === "ghost" && styles.ghostText,
              variant === "lime" && styles.limeText,
              variant === "queued" && animatedTextStyle,
            ]}
          >
            {title}
          </Animated.Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.lime,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  buttonFlat: {
    borderRadius: 0,
  },
  pressable: {
    minHeight: 58,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    borderRadius: 18,
  },
  pressableFlat: {
    borderRadius: 0,
  },
  ghost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lime: {
    backgroundColor: colors.lime,
  },
  queued: {
    backgroundColor: colors.white,
    borderWidth: 1,
    shadowColor: colors.green,
    elevation: 8,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  text: {
    color: colors.black,
    fontSize: 17,
    fontWeight: "800",
  },
  ghostText: {
    color: colors.text,
  },
  limeText: {
    color: colors.black,
  },
});
