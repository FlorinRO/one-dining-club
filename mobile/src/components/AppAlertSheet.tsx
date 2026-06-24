import * as Haptics from "expo-haptics";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppAlertButton, AppAlertConfig, AppAlertTone, hideAppAlert, useUiStore } from "../store/uiStore";
import { colors } from "../theme/colors";

const SHEET_RADIUS = 28;

const toneColors: Record<AppAlertTone, { accent: string; background: string }> = {
  info: { accent: colors.text, background: "rgba(255,255,255,0.08)" },
  success: { accent: colors.green, background: "rgba(34,197,94,0.16)" },
  warning: { accent: colors.warning, background: "rgba(245,158,11,0.16)" },
  error: { accent: colors.red, background: "rgba(255,90,85,0.16)" },
};

function triggerHapticFeedback(tone: AppAlertTone) {
  if (tone === "info") {
    Haptics.selectionAsync().catch(() => null);
    return;
  }

  const feedbackType =
    tone === "success"
      ? Haptics.NotificationFeedbackType.Success
      : tone === "error"
        ? Haptics.NotificationFeedbackType.Error
        : Haptics.NotificationFeedbackType.Warning;

  Haptics.notificationAsync(feedbackType).catch(() => null);
}

function ToneIcon({ tone }: { tone: AppAlertTone }) {
  const color = toneColors[tone].accent;

  if (tone === "success") {
    return <CheckCircle2 size={25} color={color} strokeWidth={2.6} />;
  }

  if (tone === "error") {
    return <XCircle size={25} color={color} strokeWidth={2.6} />;
  }

  if (tone === "warning") {
    return <AlertTriangle size={25} color={color} strokeWidth={2.5} />;
  }

  return <Info size={25} color={color} strokeWidth={2.5} />;
}

export function AppAlertSheet() {
  const appAlert = useUiStore((state) => state.appAlert);
  const [presentedAlert, setPresentedAlert] = useState<AppAlertConfig | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  useEffect(() => {
    if (appAlert) {
      setPresentedAlert(appAlert);
      progress.stopAnimation();
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      triggerHapticFeedback(appAlert.tone);
      return;
    }

    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setPresentedAlert(null);
    });
  }, [appAlert, progress]);

  const sheetStyle = useMemo(
    () => ({
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [88, 0],
          }),
        },
      ],
    }),
    [progress],
  );

  if (!presentedAlert) return null;

  const dismiss = () => {
    if (presentedAlert.dismissible) {
      hideAppAlert();
    }
  };

  const pressButton = (button: AppAlertButton) => {
    hideAppAlert();
    setTimeout(() => {
      void button.onPress?.();
    }, 170);
  };

  const tone = toneColors[presentedAlert.tone];
  const maxHeight = Math.min(height * 0.84, 560);
  const orderedButtons = [
    ...presentedAlert.buttons.filter((button) => button.style !== "cancel"),
    ...presentedAlert.buttons.filter((button) => button.style === "cancel"),
  ];

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={dismiss}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>

        <View pointerEvents="box-none" style={styles.sheetAnchor}>
          <Animated.View
            style={[
              styles.sheet,
              sheetStyle,
              {
                maxHeight,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
                <ToneIcon tone={presentedAlert.tone} />
              </View>
              <Pressable style={styles.closeButton} onPress={dismiss} hitSlop={10}>
                <X size={22} color={colors.muted} strokeWidth={2.5} />
              </Pressable>
            </View>

            <ScrollView style={styles.copyScroll} contentContainerStyle={styles.copyContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>{presentedAlert.title}</Text>
              {presentedAlert.message ? <Text style={styles.message}>{presentedAlert.message}</Text> : null}
            </ScrollView>

            <View style={styles.actions}>
              {orderedButtons.map((button, index) => {
                const isCancel = button.style === "cancel";
                const isDestructive = button.style === "destructive";
                return (
                  <Pressable
                    key={`${button.text}-${index}`}
                    style={({ pressed }) => [
                      styles.actionButton,
                      isCancel && styles.cancelButton,
                      isDestructive && styles.destructiveButton,
                      !isCancel && !isDestructive && styles.primaryButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => pressButton(button)}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        isCancel && styles.cancelText,
                        isDestructive && styles.destructiveText,
                        !isCancel && !isDestructive && styles.primaryText,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  sheetAnchor: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    backgroundColor: colors.card,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingTop: 10,
    paddingHorizontal: 22,
    shadowColor: "#000000",
    shadowOpacity: 0.34,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -14 },
    elevation: 24,
  },
  handle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 18,
  },
  headerRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  title: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "700",
    marginBottom: 8,
  },
  copyScroll: {
    flexShrink: 1,
  },
  copyContent: {
    paddingBottom: 2,
  },
  message: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
  },
  actions: {
    gap: 8,
    marginTop: 20,
  },
  actionButton: {
    minHeight: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: colors.green,
  },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  destructiveButton: {
    backgroundColor: "rgba(255,90,85,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,90,85,0.35)",
  },
  pressed: {
    opacity: 0.72,
  },
  actionText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  primaryText: {
    color: colors.white,
  },
  cancelText: {
    color: colors.text,
  },
  destructiveText: {
    color: colors.red,
  },
});
