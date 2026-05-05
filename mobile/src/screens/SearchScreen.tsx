import { NavigationProp, useNavigation } from "@react-navigation/native";
import { Search } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";

import { restaurantsApi } from "../api/restaurantsApi";
import { CategoryChip } from "../components/CategoryChip";
import { RestaurantCard } from "../components/RestaurantCard";
import { Screen } from "../components/Screen";
import { MainTabsParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { Restaurant } from "../types/models";

const filters = ["Deschis", "Sub 30 min", "Livrare mica", "Top rating"];

export function SearchScreen() {
  const navigation = useNavigation<NavigationProp<MainTabsParamList>>();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Deschis");

  useEffect(() => {
    restaurantsApi.list().then(setRestaurants);
  }, []);

  const filtered = useMemo(() => {
    return restaurants
      .filter((restaurant) => restaurant.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        if (activeFilter === "Top rating") return Number(b.rating) - Number(a.rating);
        if (activeFilter === "Livrare mica") return Number(a.delivery_fee) - Number(b.delivery_fee);
        if (activeFilter === "Sub 30 min") return a.estimated_delivery_time_min - b.estimated_delivery_time_min;
        return Number(b.is_open) - Number(a.is_open);
      });
  }, [activeFilter, query, restaurants]);

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBar}>
          <Search size={20} stroke={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Pizza, ramen, bowl..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <CategoryChip label={item} active={item === activeFilter} onPress={() => setActiveFilter(item)} />
          )}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <RestaurantCard
              compact
              restaurant={item}
              onPress={() =>
                navigation.navigate("HomeTab", {
                  screen: "RestaurantDetails",
                  params: { restaurant: item },
                })
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 14,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
  },
  searchBar: {
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  list: {
    paddingBottom: 110,
  },
});
