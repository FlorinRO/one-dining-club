import { NavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { Clock3, Search } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { restaurantsApi } from "../api/restaurantsApi";
import { CategoryChip } from "../components/CategoryChip";
import { RestaurantCard } from "../components/RestaurantCard";
import { Screen } from "../components/Screen";
import { MainTabsParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { Restaurant } from "../types/models";

const filters = ["Sort", "Offers", "Rating", "Delivery fee", "Delivery time"];
const inspirationCategories = ["Pizza", "Shawarma", "Burgers", "Kebab", "Sushi", "Asian", "Fast-food"];

export function SearchScreen() {
  const navigation = useNavigation<NavigationProp<MainTabsParamList>>();
  const route = useRoute<RouteProp<MainTabsParamList, "SearchTab">>();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Sort");
  const [activeCategory, setActiveCategory] = useState<string | null>(route.params?.category ?? null);
  const [recentSearches, setRecentSearches] = useState(["Star", "Kapsa", "Smash"]);

  useEffect(() => {
    restaurantsApi.list().then(setRestaurants);
  }, []);

  useEffect(() => {
    if (route.params?.category) {
      setActiveCategory(route.params.category);
      setQuery("");
    }
  }, [route.params?.category]);

  const hasSearchIntent = query.trim().length > 0 || !!activeCategory;

  const filtered = useMemo(() => {
    if (!hasSearchIntent) return [];

    return restaurants
      .filter((restaurant) => {
        const haystack = `${restaurant.name} ${restaurant.description} ${(restaurant.categories ?? []).map((c) => c.name).join(" ")}`.toLowerCase();
        const queryText = query.trim().toLowerCase();
        const categoryText = activeCategory?.toLowerCase() ?? "";

        const matchesQuery = !queryText || haystack.includes(queryText);
        const matchesCategory = !categoryText || haystack.includes(categoryText);
        return matchesQuery && matchesCategory;
      })
      .sort((a, b) => {
        if (activeFilter === "Rating") return Number(b.rating) - Number(a.rating);
        if (activeFilter === "Delivery fee") return Number(a.delivery_fee) - Number(b.delivery_fee);
        if (activeFilter === "Delivery time") return a.estimated_delivery_time_min - b.estimated_delivery_time_min;
        return Number(b.is_open) - Number(a.is_open);
      });
  }, [activeCategory, activeFilter, hasSearchIntent, query, restaurants]);

  const commitRecentSearch = () => {
    const value = query.trim();
    if (!value) return;
    setRecentSearches((prev) => [value, ...prev.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8));
  };

  const clearSearchContext = () => {
    setQuery("");
    setActiveCategory(null);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBar}>
          <Search size={20} stroke={colors.muted} />
          <TextInput
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (text.length > 0) setActiveCategory(null);
            }}
            onSubmitEditing={commitRecentSearch}
            placeholder="Food, restaurants, stores..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {filters.map((item) => (
            <View key={item} style={styles.filterChipWrap}>
              <CategoryChip label={item} active={item === activeFilter} onPress={() => setActiveFilter(item)} />
            </View>
          ))}
        </ScrollView>

        {hasSearchIntent ? (
          <>
            {!!activeCategory && (
              <Pressable style={styles.activeCategoryPill} onPress={clearSearchContext}>
                <Text style={styles.activeCategoryText}>Categorie: {activeCategory} · reset</Text>
              </Pressable>
            )}
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
              ListEmptyComponent={<Text style={styles.emptyText}>Nu am găsit restaurante pentru selecția curentă.</Text>}
            />
          </>
        ) : (
          <FlatList
            data={inspirationCategories}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.discoveryList}
            ListHeaderComponent={
              <View style={styles.discoveryHeader}>
                {recentSearches.map((item) => (
                  <Pressable
                    key={item}
                    style={styles.recentItem}
                    onPress={() => {
                      setQuery(item);
                    }}
                  >
                    <Clock3 size={18} stroke={colors.muted} />
                    <Text style={styles.recentText}>{item}</Text>
                  </Pressable>
                ))}
                <Text style={styles.sectionTitle}>Find some inspiration</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.inspirationItem} onPress={() => setActiveCategory(item)}>
                <Text style={styles.inspirationText}>{item}</Text>
              </Pressable>
            )}
          />
        )}
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
  filtersRow: {
    paddingRight: 6,
  },
  filterChipWrap: {
    marginRight: 10,
  },
  list: {
    paddingBottom: 110,
  },
  activeCategoryPill: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  activeCategoryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 12,
  },
  discoveryList: {
    paddingBottom: 110,
  },
  discoveryHeader: {
    gap: 8,
    marginBottom: 18,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  recentText: {
    color: colors.text,
    fontSize: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8,
  },
  inspirationItem: {
    paddingVertical: 13,
  },
  inspirationText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
});
