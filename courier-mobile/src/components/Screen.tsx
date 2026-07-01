import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../theme/colors";

type Props = {
  children: ReactNode;
  padded?: boolean;
  edges?: Edge[];
};

export function Screen({ children, padded = true, edges = ["top", "left", "right"] }: Props) {
  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      <View style={[styles.container, padded && styles.padded]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padded: {
    paddingHorizontal: 22,
  },
});
