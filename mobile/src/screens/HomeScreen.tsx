import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Filter, MapPin, Search } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { restaurantsApi } from "../api/restaurantsApi";
import { CategoryChip } from "../components/CategoryChip";
import { RestaurantCard } from "../components/RestaurantCard";
import { Screen } from "../components/Screen";
import { HomeStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

const categoryLabels = ["Toate", "Italian", "Healthy", "Asian", "Burger", "Cafea"];

export function HomeScreen({ navigation }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Toate");

  useEffect(() => {
    restaurantsApi.list().then(setRestaurants);
  }, []);

  const filtered = useMemo(() => {
    return restaurants.filter((restaurant) => {
      const matchesSearch = restaurant.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === "Toate" || restaurant.categories?.some((category) => category.name === activeCategory);
      return matchesSearch && matchesCategory;
    });
  }, [restaurants, search, activeCategory]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.locationLabel}>Livreaza la</Text>
            <View style={styles.locationRow}>
              <MapPin size={18} stroke={colors.lime} />
              <Text style={styles.location}>Bucuresti, centru</Text>
            </View>
          </View>
          <Pressable style={styles.filterButton}>
            <Filter size={20} stroke={colors.text} />
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Search size={20} stroke={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cauta restaurante sau preparate"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.promo}>
          <Text style={styles.promoKicker}>Club deal</Text>
          <Text style={styles.promoTitle}>-10% la prima comanda peste 60 lei</Text>
          <Text style={styles.promoCode}>Cod: FIRSTCLUB</Text>
        </View>

        <FlatList
          horizontal
          data={categoryLabels}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <CategoryChip label={item} active={item === activeCategory} onPress={() => setActiveCategory(item)} />
          )}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
          contentContainerStyle={styles.chips}
        />

        <SectionTitle title="Restaurante recomandate" />
        <FlatList
          horizontal
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <RestaurantCard restaurant={item} onPress={() => navigation.navigate("RestaurantDetails", { restaurant: item })} />
          )}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
        />

        <SectionTitle title="Aproape de tine" />
        <View style={styles.nearbyList}>
          {filtered.map((restaurant) => (
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

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 14,
    paddingBottom: 120,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationLabel: {
    color: colors.muted,
    fontWeight: "700",
  },
  locationRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  location: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
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
  promo: {
    minHeight: 146,
    borderRadius: 28,
    backgroundColor: colors.red,
    padding: 20,
    justifyContent: "space-between",
  },
  promoKicker: {
    color: colors.lime,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  promoTitle: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
  },
  promoCode: {
    color: colors.white,
    fontWeight: "800",
  },
  chips: {
    flexWrap: "wrap",
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  nearbyList: {
    gap: 14,
  },
});
