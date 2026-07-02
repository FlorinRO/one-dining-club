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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.18)",
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});
