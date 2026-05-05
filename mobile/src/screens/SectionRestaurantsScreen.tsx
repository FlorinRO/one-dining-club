import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { NativeSyntheticEvent, NativeScrollEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { restaurantsApi } from "../api/restaurantsApi";
import { RestaurantCard } from "../components/RestaurantCard";
import { Screen } from "../components/Screen";
import { HomeStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "SectionRestaurants">;

export function SectionRestaurantsScreen({ navigation, route }: Props) {
  const { mode, title } = route.params;
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    restaurantsApi.list().then(setRestaurants);
  }, []);

  const list = useMemo(() => {
    if (mode === "nearby") {
      return [...restaurants].sort((a, b) => Number(a.distance_km ?? 99) - Number(b.distance_km ?? 99));
    }

    return [...restaurants].sort((a, b) => {
      const scoreA = Number(a.rating) + (a.has_offer ? 0.2 : 0);
      const scoreB = Number(b.rating) + (b.has_offer ? 0.2 : 0);
      return scoreB - scoreA;
    });
  }, [mode, restaurants]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;

    if (currentY <= 0) {
      if (showStickyHeader) setShowStickyHeader(false);
      lastScrollY.current = 0;
      return;
    }

    const isScrollingDown = currentY > lastScrollY.current + 4;
    if (isScrollingDown && currentY > 24 && !showStickyHeader) {
      setShowStickyHeader(true);
    }

    lastScrollY.current = currentY;
  };

  return (
    <Screen>
      {showStickyHeader && (
        <View style={styles.stickyHeader}>
          <Pressable style={styles.stickyBackButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} stroke={colors.text} />
          </Pressable>
          <View style={styles.stickyTitleWrap} pointerEvents="none">
            <Text style={styles.stickyTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={26} stroke={colors.text} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.list}>
          {list.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              compact
              restaurant={restaurant}
              onPress={() => navigation.navigate("RestaurantDetails", { restaurant })}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 6,
    paddingBottom: 20,
    gap: 18,
  },
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    height: 56,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  stickyBackButton: {
    position: "absolute",
    left: 4,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  stickyTitleWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
  },
  stickyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  header: {
    alignItems: "flex-start",
    gap: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    letterSpacing: 0,
    marginBottom: 4,
  },
  list: {
    gap: 18,
  },
});
