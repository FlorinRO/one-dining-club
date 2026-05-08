import { Pressable, StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from "react-native";

import { colors } from "../theme/colors";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  activeStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  activeTextStyle?: StyleProp<TextStyle>;
  stabilizeWidthOnActive?: boolean;
};

export function CategoryChip({
  label,
  active,
  onPress,
  style,
  activeStyle,
  textStyle,
  activeTextStyle,
  stabilizeWidthOnActive,
}: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, style, active && styles.active, active && activeStyle]}>
      {stabilizeWidthOnActive ? (
        <Text style={[styles.text, textStyle, styles.ghostBoldText, activeTextStyle]}>{label}</Text>
      ) : null}
      <Text
        style={[
          styles.text,
          textStyle,
          active && styles.activeText,
          active && activeTextStyle,
          stabilizeWidthOnActive && styles.stabilizedVisibleText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  text: {
    color: colors.text,
    fontWeight: "700",
  },
  activeText: {
    color: colors.background,
  },
  ghostBoldText: {
    opacity: 0,
    fontWeight: "700",
  },
  stabilizedVisibleText: {
    position: "absolute",
  },
});
