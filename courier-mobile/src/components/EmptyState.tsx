import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
  },
  description: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 15,
    lineHeight: 22,
  },
});
