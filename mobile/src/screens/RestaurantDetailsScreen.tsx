import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Bike, Clock3, Star } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { restaurantsApi } from "../api/restaurantsApi";
import { CategoryChip } from "../components/CategoryChip";
import { FloatingCartBar } from "../components/FloatingCartBar";
import { FALLBACK_RESTAURANT_IMAGE, resolveImageUri } from "../lib/images";
import { MapPreview } from "../components/MapPreview";
import { ProductCard } from "../components/ProductCard";
import { HomeStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { Product, ProductCategory, Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "RestaurantDetails">;

export function RestaurantDetailsScreen({ navigation, route }: Props) {
  const initialRestaurant = route.params.restaurant;
  const [restaurant, setRestaurant] = useState<Restaurant>(initialRestaurant);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");

  useEffect(() => {
    restaurantsApi.detail(initialRestaurant.id).then(setRestaurant);
    restaurantsApi.products(initialRestaurant.id).then(setProducts);
    restaurantsApi.categories(initialRestaurant.id).then(setCategories);
  }, [initialRestaurant.id]);

  const visibleProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((product) => product.category === activeCategory);
  }, [activeCategory, products]);

  const categoryName = restaurant.categories?.[0]?.name ?? "Restaurant";

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View>
          <Image source={{ uri: resolveImageUri(restaurant.cover_image, FALLBACK_RESTAURANT_IMAGE) }} style={styles.hero} />
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft stroke={colors.text} size={22} />
          </Pressable>
        </View>
        <View style={styles.body}>
          <Text style={styles.name}>{restaurant.name}</Text>
          <Text style={styles.description}>{restaurant.description}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Star size={16} stroke={colors.lime} fill={colors.lime} />
              <Text style={styles.metaText}>{Number(restaurant.rating).toFixed(1)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock3 size={16} stroke={colors.muted} />
              <Text style={styles.metaText}>
                {restaurant.estimated_delivery_time_min}-{restaurant.estimated_delivery_time_max} min
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Bike size={16} stroke={colors.muted} />
              <Text style={styles.metaText}>{Number(restaurant.delivery_fee).toFixed(2)} lei</Text>
            </View>
          </View>
          <Text style={styles.type}>{categoryName} · 1.8 km · comanda minima {Number(restaurant.minimum_order).toFixed(0)} lei</Text>
          <View style={styles.promo}>
            <Text style={styles.promoText}>Promo activ: 10% reducere cu FIRSTCLUB</Text>
          </View>
          <MapPreview latitude={restaurant.latitude} longitude={restaurant.longitude} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            <CategoryChip label="Toate" active={activeCategory === "all"} onPress={() => setActiveCategory("all")} />
            {categories.map((category) => (
              <CategoryChip
                key={category.id}
                label={category.name}
                active={activeCategory === category.id}
                onPress={() => setActiveCategory(category.id)}
              />
            ))}
          </ScrollView>
          <View style={styles.products}>
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => navigation.navigate("ProductDetails", { restaurant, product })}
              />
            ))}
          </View>
        </View>
      </ScrollView>
      <FloatingCartBar onPress={() => navigation.navigate("CartFlow", { screen: "CartHome" })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 110,
  },
  hero: {
    width: "100%",
    height: 258,
    backgroundColor: colors.cardSoft,
  },
  backButton: {
    position: "absolute",
    top: 58,
    left: 18,
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  body: {
    padding: 18,
    gap: 16,
  },
  name: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900",
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: colors.text,
    fontWeight: "800",
  },
  type: {
    color: colors.muted,
    fontWeight: "700",
  },
  promo: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(231, 51, 63, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(231, 51, 63, 0.34)",
  },
  promoText: {
    color: colors.text,
    fontWeight: "800",
  },
  categories: {
    gap: 10,
  },
  products: {
    gap: 12,
  },
});
