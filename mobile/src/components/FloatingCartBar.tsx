import { ShoppingBag } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from "react-native";

import { useI18n } from "../i18n/useI18n";
import { useCartStore } from "../store/cartStore";
import { useUiStore } from "../store/uiStore";
import { colors } from "../theme/colors";

type Props = {
  onPress: () => void;
  mode?: "animated" | "compact";
  style?: StyleProp<ViewStyle>;
  compactStyle?: "default" | "feed";
};

export function FloatingCartBar({ onPress, mode = "animated", style, compactStyle = "default" }: Props) {
  const { tr } = useI18n();
  const { width: screenWidth } = useWindowDimensions();
  const items = useCartStore((state) => state.items);
  const floatingCartExpanded = useUiStore((state) => state.floatingCartExpanded);
  const safeItems = Array.isArray(items) ? items : [];
  const itemsCount = safeItems.reduce((sum, item) => {
    const quantity = Number(item?.quantity ?? 0);
    return sum + (Number.isFinite(quantity) ? quantity : 0);
  }, 0);
  const progress = useRef(new Animated.Value(floatingCartExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: floatingCartExpanded ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [floatingCartExpanded, progress]);

  if (!itemsCount) {
    return null;
  }

  if (mode === "compact") {
    const isFeedCompact = compactStyle === "feed";
    return (
      <View style={[styles.button, styles.buttonCompact, isFeedCompact && styles.buttonCompactFeed, style]}>
        <Pressable onPress={onPress} style={styles.pressable}>
          <ShoppingBag size={20} stroke={isFeedCompact ? "#22C55E" : "#000000"} />
          <View style={[styles.badge, styles.badgeCollapsed, isFeedCompact && styles.badgeCompactFeed]}>
            <Text style={styles.badgeText}>{itemsCount}</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  const expandedWidth = 170;
  const safeScreenWidth = Number.isFinite(screenWidth) && screenWidth > 0 ? screenWidth : 390;
  const expandedRight = Math.max(18, (safeScreenWidth - expandedWidth) / 2);
  const animatedButtonStyle = {
    width: progress.interpolate({ inputRange: [0, 1], outputRange: [56, expandedWidth] }),
    height: progress.interpolate({ inputRange: [0, 1], outputRange: [56, 48] }),
    borderRadius: progress.interpolate({ inputRange: [0, 1], outputRange: [28, 24] }),
    right: progress.interpolate({ inputRange: [0, 1], outputRange: [18, expandedRight] }),
  };

  const inlineContentOpacity = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0, 1] });
  const inlineContentWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 120] });
  const iconSpacing = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });
  const collapsedBadgeOpacity = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0, 0] });

  return (
    <Animated.View style={[styles.button, styles.buttonCollapsed, animatedButtonStyle, style]}>
      <Pressable onPress={onPress} style={styles.pressable}>
        <View style={styles.content}>
          <ShoppingBag size={20} stroke="#000000" />
          <Animated.View style={{ width: iconSpacing }} />
          <Animated.View style={[styles.inlineContent, { width: inlineContentWidth, opacity: inlineContentOpacity }]}>
            <Text numberOfLines={1} style={styles.buttonLabel}>
              {tr("Vezi Coșul", "View cart")}
            </Text>
            <View style={[styles.badge, styles.badgeExpanded]}>
              <Text style={styles.badgeText}>{itemsCount}</Text>
            </View>
          </Animated.View>
        </View>
        <Animated.View style={[styles.badge, styles.badgeCollapsed, { opacity: collapsedBadgeOpacity }]}>
          <Text style={styles.badgeText}>{itemsCount}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 94,
    backgroundColor: "#22C55E",
    borderWidth: 1,
    borderColor: "#000000",
    zIndex: 25,
    overflow: "visible",
  },
  buttonCollapsed: {
    right: 18,
  },
  buttonCompact: {
    width: 56,
    height: 56,
    borderRadius: 28,
    right: 18,
    bottom: 94,
  },
  buttonCompactFeed: {
    backgroundColor: "transparent",
    borderColor: "#22C55E",
    borderWidth: 2,
  },
  pressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  inlineContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  buttonLabel: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
    marginLeft: 4,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCollapsed: {
    position: "absolute",
    top: -6,
    right: -4,
  },
  badgeExpanded: {
    marginLeft: 10,
  },
  badgeCompactFeed: {
    backgroundColor: "#000000",
  },
  badgeText: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 16,
    fontWeight: "400",
  },
});
