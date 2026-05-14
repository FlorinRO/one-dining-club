import { NavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowUpDown,
  Bike,
  Check,
  ChevronDown,
  Clock3,
  Footprints,
  Route,
  Search,
  SearchX,
  SlidersHorizontal,
  Star,
  Tag,
  X,
} from "lucide-react-native";
import { ComponentType, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, FlatList, Image, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { restaurantsApi } from "../api/restaurantsApi";
import { Screen } from "../components/Screen";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { deliveryWindow } from "../lib/format";
import { FALLBACK_PRODUCT_IMAGE, FALLBACK_RESTAURANT_IMAGE, resolveImageUri } from "../lib/images";
import { MainTabsParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { Product, Restaurant } from "../types/models";

type FilterKey = "sort" | "offers" | "rating" | "deliveryFee" | "deliveryTime" | "pickup" | "distance" | "categories";
type ActiveSheetKey = FilterKey | "allFilters";
type SortValue = "relevant" | "closest" | "deliveryFee" | "deliveryTime" | "rating";
type FilterOption = { label: string; value: string | number | boolean };
type SheetConfig = { title: string; type: "single" | "multi"; options: FilterOption[] };
type ChipIcon = ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;

type DiscoveryCategory = {
  label: string;
  emoji: string;
};

const filters: Array<{ key: FilterKey; label: string; icon: ChipIcon; dropdown?: boolean }> = [
  { key: "sort", label: "Sort", icon: ArrowUpDown, dropdown: true },
  { key: "offers", label: "Offers", icon: Tag },
  { key: "rating", label: "Rating", icon: Star, dropdown: true },
  { key: "deliveryFee", label: "Delivery fee", icon: Bike, dropdown: true },
  { key: "deliveryTime", label: "Delivery time", icon: Clock3, dropdown: true },
  { key: "pickup", label: "Pickup", icon: Footprints },
  { key: "distance", label: "Distance", icon: Route, dropdown: true },
  { key: "categories", label: "Categories", icon: SlidersHorizontal, dropdown: true },
];

const discoveryCategories: DiscoveryCategory[] = [
  { label: "Italian", emoji: "🇮🇹" },
  { label: "Pizza", emoji: "🍕" },
  { label: "Burgers", emoji: "🍔" },
  { label: "Asian", emoji: "🥡" },
  { label: "Sushi", emoji: "🍣" },
  { label: "Kebab", emoji: "🥙" },
  { label: "Wraps", emoji: "🌯" },
  { label: "Chicken", emoji: "🍗" },
  { label: "Sandwich", emoji: "🥪" },
  { label: "Japanese", emoji: "🍤" },
  { label: "Bakery", emoji: "🥐" },
  { label: "Groceries", emoji: "🛒" },
  { label: "Healthy", emoji: "🥑" },
  { label: "Thai", emoji: "🍜" },
  { label: "Salads", emoji: "🥙" },
  { label: "Ramen", emoji: "🍜" },
  { label: "Seafood", emoji: "🦐" },
  { label: "Desserts", emoji: "🧁" },
  { label: "Indian", emoji: "🇮🇳" },
  { label: "Breakfast", emoji: "🍳" },
  { label: "Pasta", emoji: "🍝" },
  { label: "Coffee", emoji: "☕" },
  { label: "BBQ", emoji: "🍖" },
  { label: "Soup", emoji: "🍲" },
];

function getCategoryEmoji(label: string) {
  const match = discoveryCategories.find((item) => item.label.toLowerCase() === label.toLowerCase());
  return match?.emoji ?? "🍽️";
}

function formatRon(value: string | number) {
  return `${Number(value).toFixed(2).replace(".", ",")} RON`;
}

export function SearchScreen() {
  const { tr } = useI18n();
  const navigation = useNavigation<NavigationProp<MainTabsParamList>>();
  const route = useRoute<RouteProp<MainTabsParamList, "SearchTab">>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortValue>("relevant");
  const [offersOnly, setOffersOnly] = useState(false);
  const [pickupOnly, setPickupOnly] = useState(false);
  const [minimumRating, setMinimumRating] = useState<number | null>(null);
  const [maximumDeliveryFee, setMaximumDeliveryFee] = useState<number | null>(null);
  const [maximumDeliveryTime, setMaximumDeliveryTime] = useState<number | null>(null);
  const [maximumDistance, setMaximumDistance] = useState<number | null>(null);
  const [activeCategories, setActiveCategories] = useState<string[]>(route.params?.category ? [route.params.category] : []);
  const [activeSheet, setActiveSheet] = useState<ActiveSheetKey | null>(null);
  const [recentSearches, setRecentSearches] = useState(["Star", "Kapsa", "Smash"]);
  const [isFocusedFromHome, setIsFocusedFromHome] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const entryAnimation = useRef(new Animated.Value(1)).current;
  const focusAnimation = useRef(new Animated.Value(0)).current;
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();
  const sheetPaddingBottom = Math.max(insets.bottom, 18) + 14;
  const bottomSheetMaxHeight = Math.max(320, windowHeight - insets.top - 24);

  const filterLabel = useCallback(
    (key: FilterKey) => {
      if (key === "sort") return tr("Sortare", "Sort");
      if (key === "offers") return tr("Oferte", "Offers");
      if (key === "rating") return tr("Rating", "Rating");
      if (key === "deliveryFee") return tr("Taxă de livrare", "Delivery fee");
      if (key === "deliveryTime") return tr("Timp de livrare", "Delivery time");
      if (key === "pickup") return tr("Ridicare", "Pickup");
      if (key === "distance") return tr("Distanță", "Distance");
      return tr("Categorii", "Categories");
    },
    [tr],
  );

  const localizedSheetConfigs = useMemo<Record<FilterKey, SheetConfig>>(
    () => ({
      sort: {
        title: tr("Sortare", "Sort"),
        type: "single",
        options: [
          { label: tr("Cele mai relevante", "Most relevant"), value: "relevant" },
          { label: tr("Cele mai apropiate", "Closest"), value: "closest" },
          { label: tr("Cel mai mic cost de livrare", "Lowest delivery fee"), value: "deliveryFee" },
          { label: tr("Cea mai rapidă livrare", "Fastest delivery"), value: "deliveryTime" },
          { label: tr("Cel mai bun rating", "Best rating"), value: "rating" },
        ],
      },
      offers: {
        title: tr("Oferte", "Offers"),
        type: "single",
        options: [{ label: tr("Doar restaurante cu oferte", "Only restaurants with offers"), value: true }],
      },
      rating: {
        title: tr("Rating", "Rating"),
        type: "single",
        options: [
          { label: tr("4.3 sau mai mare", "4.3 or higher"), value: 4.3 },
          { label: tr("4.5 sau mai mare", "4.5 or higher"), value: 4.5 },
          { label: tr("4.7 sau mai mare", "4.7 or higher"), value: 4.7 },
        ],
      },
      deliveryFee: {
        title: tr("Taxă de livrare", "Delivery fee"),
        type: "single",
        options: [
          { label: tr("Gratuit", "Free"), value: 0 },
          { label: tr("3,50 RON sau mai puțin", "3.50 RON or less"), value: 3.5 },
          { label: tr("5,00 RON sau mai puțin", "5.00 RON or less"), value: 5 },
        ],
      },
      deliveryTime: {
        title: tr("Timp de livrare", "Delivery time"),
        type: "single",
        options: [
          { label: tr("20 min sau mai puțin", "20 min or less"), value: 20 },
          { label: tr("30 min sau mai puțin", "30 min or less"), value: 30 },
          { label: tr("45 min sau mai puțin", "45 min or less"), value: 45 },
        ],
      },
      pickup: {
        title: tr("Ridicare", "Pickup"),
        type: "single",
        options: [{ label: tr("Ridicare disponibilă", "Pickup available"), value: true }],
      },
      distance: {
        title: tr("Distanță", "Distance"),
        type: "single",
        options: [
          { label: tr("1 km sau mai puțin", "1 km or less"), value: 1 },
          { label: tr("2 km sau mai puțin", "2 km or less"), value: 2 },
          { label: tr("3 km sau mai puțin", "3 km or less"), value: 3 },
        ],
      },
      categories: {
        title: tr("Categorii", "Categories"),
        type: "multi",
        options: discoveryCategories.map((item) => ({ label: `${item.emoji} ${item.label}`, value: item.label })),
      },
    }),
    [tr],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSearchData() {
      const ordering =
        sort === "deliveryFee"
          ? "delivery_fee"
          : sort === "deliveryTime"
            ? "estimated_delivery_time_min"
            : sort === "rating"
              ? "-rating"
              : undefined;
      const nextRestaurants = await restaurantsApi.list({
        search: query.trim() || undefined,
        category_name: activeCategories.length ? activeCategories.join(",") : undefined,
        min_rating: minimumRating ?? undefined,
        max_delivery_fee: maximumDeliveryFee ?? undefined,
        max_delivery_time: maximumDeliveryTime ?? undefined,
        max_distance_km: maximumDistance ?? undefined,
        has_offer: offersOnly || undefined,
        supports_pickup: pickupOnly || undefined,
        ordering,
      });
      const productGroups = await Promise.all(nextRestaurants.map((restaurant) => restaurantsApi.products(restaurant.id)));

      if (!isMounted) return;
      setRestaurants(nextRestaurants);
      setProducts(productGroups.flat());
    }

    loadSearchData();

    return () => {
      isMounted = false;
    };
  }, [activeCategories, maximumDeliveryFee, maximumDeliveryTime, maximumDistance, minimumRating, offersOnly, pickupOnly, query, sort]);

  useEffect(() => {
    if (route.params?.category) {
      setActiveCategories([route.params.category]);
      setQuery("");
      navigation.setParams({ category: undefined });
    }
  }, [navigation, route.params?.category]);

  useEffect(() => {
    if (route.params?.openFilters) {
      setActiveSheet("allFilters");
      navigation.setParams({ openFilters: undefined });
    }
  }, [navigation, route.params?.openFilters]);

  useEffect(() => {
    if (!route.params?.focusSearch) return;

    setIsFocusedFromHome(true);
    entryAnimation.setValue(0);
    Animated.timing(entryAnimation, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        searchInputRef.current?.focus();
      }
    });
    navigation.setParams({ focusSearch: undefined });
  }, [entryAnimation, navigation, route.params?.focusSearch]);

  useEffect(() => {
    Animated.timing(focusAnimation, {
      toValue: isFocusedFromHome ? 1 : 0,
      duration: 260,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [focusAnimation, isFocusedFromHome]);

  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidHide", () => {
      searchInputRef.current?.blur();
      setIsFocusedFromHome(false);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const hasSearchIntent = query.trim().length > 0 || activeCategories.length > 0;
  const availableProducts = useMemo(() => products.filter((product) => product.is_available), [products]);

  const productMatchesSearchContext = (product: Product, queryText: string) => {
    const productHaystack = `${product.name} ${product.description} ${product.restaurant_name ?? ""} ${product.category_name ?? ""}`.toLowerCase();
    const matchesQuery = !queryText || productHaystack.includes(queryText);
    const matchesCategory =
      activeCategories.length === 0 || activeCategories.some((category) => productHaystack.includes(category.toLowerCase()));

    return matchesQuery && matchesCategory;
  };

  const getRestaurantProductsForSearch = (restaurant: Restaurant) => {
    const queryText = query.trim().toLowerCase();
    const restaurantProducts = availableProducts.filter((product) => product.restaurant === restaurant.id);
    const matchingProducts = restaurantProducts.filter((product) => productMatchesSearchContext(product, queryText));

    return matchingProducts.length > 0 ? matchingProducts : restaurantProducts;
  };

  const filtered = useMemo(() => {
    if (!hasSearchIntent) return [];
    const queryText = query.trim().toLowerCase();

    return restaurants
      .filter((restaurant) => {
        const restaurantHaystack = `${restaurant.name} ${restaurant.description} ${(restaurant.categories ?? []).map((c) => c.name).join(" ")}`.toLowerCase();
        const restaurantProducts = availableProducts.filter((product) => product.restaurant === restaurant.id);
        const hasMatchingProducts = restaurantProducts.some((product) => productMatchesSearchContext(product, queryText));
        const matchesQuery = !queryText || restaurantHaystack.includes(queryText) || hasMatchingProducts;
        const matchesCategory =
          activeCategories.length === 0 ||
          activeCategories.some((category) => restaurantHaystack.includes(category.toLowerCase())) ||
          hasMatchingProducts;
        const matchesOffers = !offersOnly || !!restaurant.has_offer;
        const matchesPickup = !pickupOnly || !!restaurant.supports_pickup;
        const matchesRating = minimumRating === null || Number(restaurant.rating) >= minimumRating;
        const matchesDeliveryFee = maximumDeliveryFee === null || Number(restaurant.delivery_fee) <= maximumDeliveryFee;
        const matchesDeliveryTime = maximumDeliveryTime === null || restaurant.estimated_delivery_time_min <= maximumDeliveryTime;
        const matchesDistance = maximumDistance === null || Number(restaurant.distance_km ?? 99) <= maximumDistance;

        return (
          matchesQuery &&
          matchesCategory &&
          matchesOffers &&
          matchesPickup &&
          matchesRating &&
          matchesDeliveryFee &&
          matchesDeliveryTime &&
          matchesDistance
        );
      })
      .sort((a, b) => {
        if (sort === "closest") return Number(a.distance_km ?? 99) - Number(b.distance_km ?? 99);
        if (sort === "deliveryFee") return Number(a.delivery_fee) - Number(b.delivery_fee);
        if (sort === "deliveryTime") return a.estimated_delivery_time_min - b.estimated_delivery_time_min;
        if (sort === "rating") return Number(b.rating) - Number(a.rating);
        return Number(b.is_open) - Number(a.is_open) || Number(b.rating) - Number(a.rating);
      });
  }, [activeCategories, availableProducts, hasSearchIntent, maximumDeliveryFee, maximumDeliveryTime, maximumDistance, minimumRating, offersOnly, pickupOnly, query, restaurants, sort]);

  const commitRecentSearch = () => {
    const value = query.trim();
    if (!value) return;
    setRecentSearches((prev) => [value, ...prev.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8));
  };

  const clearSearchContext = () => {
    setQuery("");
    setActiveCategories([]);
  };

  const resetFilter = (key: FilterKey) => {
    if (key === "sort") setSort("relevant");
    if (key === "offers") setOffersOnly(false);
    if (key === "rating") setMinimumRating(null);
    if (key === "deliveryFee") setMaximumDeliveryFee(null);
    if (key === "deliveryTime") setMaximumDeliveryTime(null);
    if (key === "pickup") setPickupOnly(false);
    if (key === "distance") setMaximumDistance(null);
    if (key === "categories") setActiveCategories([]);
  };

  const isFilterActive = (key: FilterKey) => {
    if (key === "sort") return sort !== "relevant";
    if (key === "offers") return offersOnly;
    if (key === "rating") return minimumRating !== null;
    if (key === "deliveryFee") return maximumDeliveryFee !== null;
    if (key === "deliveryTime") return maximumDeliveryTime !== null;
    if (key === "pickup") return pickupOnly;
    if (key === "distance") return maximumDistance !== null;
    return activeCategories.length > 0;
  };

  const isOptionSelected = (key: FilterKey, value: FilterOption["value"]) => {
    if (key === "sort") return sort === value;
    if (key === "offers") return offersOnly === value;
    if (key === "rating") return minimumRating === value;
    if (key === "deliveryFee") return maximumDeliveryFee === value;
    if (key === "deliveryTime") return maximumDeliveryTime === value;
    if (key === "pickup") return pickupOnly === value;
    if (key === "distance") return maximumDistance === value;
    return activeCategories.includes(String(value));
  };

  const selectOption = (key: FilterKey, value: FilterOption["value"]) => {
    if (key === "sort") setSort(value as SortValue);
    if (key === "offers") setOffersOnly((current) => !current);
    if (key === "rating") setMinimumRating((current) => (current === value ? null : Number(value)));
    if (key === "deliveryFee") setMaximumDeliveryFee((current) => (current === value ? null : Number(value)));
    if (key === "deliveryTime") setMaximumDeliveryTime((current) => (current === value ? null : Number(value)));
    if (key === "pickup") setPickupOnly((current) => !current);
    if (key === "distance") setMaximumDistance((current) => (current === value ? null : Number(value)));
    if (key === "categories") {
      const category = String(value);
      setActiveCategories((current) => (current.includes(category) ? current.filter((item) => item !== category) : [...current, category]));
    }
  };

  const emptyQueryLabel = query.trim() || activeCategories.join(", ") || "selecția curentă";
  const sheetConfig = activeSheet && activeSheet !== "allFilters" ? localizedSheetConfigs[activeSheet] : null;
  const activeFiltersCount =
    (sort !== "relevant" ? 1 : 0) +
    (offersOnly ? 1 : 0) +
    (pickupOnly ? 1 : 0) +
    (minimumRating !== null ? 1 : 0) +
    (maximumDeliveryFee !== null ? 1 : 0) +
    (maximumDeliveryTime !== null ? 1 : 0) +
    (maximumDistance !== null ? 1 : 0) +
    (activeCategories.length > 0 ? 1 : 0);

  const onFilterChipPress = (key: FilterKey) => {
    if (key === "offers") {
      setOffersOnly((current) => !current);
      return;
    }

    if (key === "pickup") {
      setPickupOnly((current) => !current);
      return;
    }

    setActiveSheet(key);
  };

  const resetAllFilters = () => {
    setSort("relevant");
    setOffersOnly(false);
    setPickupOnly(false);
    setMinimumRating(null);
    setMaximumDeliveryFee(null);
    setMaximumDeliveryTime(null);
    setMaximumDistance(null);
    setActiveCategories([]);
  };

  return (
    <Screen>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: entryAnimation,
            transform: [
              {
                translateY: entryAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [34, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, isFocusedFromHome && styles.searchBarFocused]}>
            <Search size={23} stroke={colors.text} strokeWidth={2.6} />
            <TextInput
              ref={searchInputRef}
              value={query}
              onFocus={() => {
                setIsFocusedFromHome(true);
              }}
              onChangeText={(text) => {
                setQuery(text);
                if (text.length > 0) setActiveCategories([]);
              }}
              onSubmitEditing={commitRecentSearch}
              returnKeyType="search"
              placeholder={tr("Caută restaurante sau preparate", "Search restaurants or dishes")}
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
            />
            {!isFocusedFromHome ? (
              <Pressable hitSlop={8} onPress={() => setActiveSheet("allFilters")}>
                <SlidersHorizontal size={22} stroke={colors.text} strokeWidth={2.7} />
                {activeFiltersCount > 0 ? (
                  <View style={styles.searchFilterBadge}>
                    <Text style={styles.searchFilterBadgeText}>{activeFiltersCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            ) : null}
          </View>
          <Animated.View
            style={[
              styles.cancelWrap,
              {
                width: focusAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 62],
                }),
                opacity: focusAnimation,
              },
            ]}
            pointerEvents={isFocusedFromHome ? "auto" : "none"}
          >
            <Pressable
              hitSlop={8}
              onPress={() => {
                setIsFocusedFromHome(false);
                searchInputRef.current?.blur();
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.filtersBlock}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersRow}
          >
            {filters.map((item) => (
              <FilterChip
                key={item.key}
                label={filterLabel(item.key)}
                icon={item.icon}
                active={isFilterActive(item.key)}
                redActive={item.key === "offers" || item.key === "pickup"}
                dropdown={item.dropdown}
                onPress={() => onFilterChipPress(item.key)}
              />
            ))}
          </ScrollView>

          {activeCategories.length > 0 && (
            <View style={styles.activeCategoryPillRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeCategoriesRow}>
                {activeCategories.map((category) => (
                  <View key={category} style={styles.activeCategoryPill}>
                    <Text style={styles.activeCategoryEmoji}>{getCategoryEmoji(category)}</Text>
                    <Text style={styles.activeCategoryText}>{category}</Text>
                    <Pressable hitSlop={8} onPress={() => setActiveCategories((current) => current.filter((item) => item !== category))}>
                      <X size={14} stroke={colors.text} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {hasSearchIntent ? (
          <>
            <FlatList
              key="search-results-list"
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              style={styles.resultsList}
              ListHeaderComponent={
                <>
                  {filtered.length > 0 && (
                    <View style={styles.resultsHeader}>
                      <Text style={styles.resultsCountText}>{filtered.length} {tr("rezultate", "results")}</Text>
                      <Pressable style={styles.resetResultsButton} onPress={clearSearchContext}>
                        <Text style={styles.resetResultsText}>Reset</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              }
              renderItem={({ item }) => (
                <SearchRestaurantResult
                  restaurant={item}
                  products={getRestaurantProductsForSearch(item)}
                  onPress={() =>
                    navigation.navigate("HomeTab", {
                      screen: "RestaurantDetails",
                      params: { restaurant: item },
                    })
                  }
                  onProductPress={(product) =>
                    navigation.navigate("HomeTab", {
                      screen: "ProductDetails",
                      params: { restaurant: item, product },
                    })
                  }
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 34 }} />}
              showsVerticalScrollIndicator={false}
              onScroll={trackFloatingCartScrollDirection}
              scrollEventThrottle={16}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <SearchX size={24} stroke={colors.muted} />
                  </View>
                  <Text style={styles.emptyTitle}>{tr("Niciun rezultat", "No results")}</Text>
                  <Text style={styles.emptyText}>{tr(`Nu există rezultate pentru „${emptyQueryLabel}”.`, `No results for "${emptyQueryLabel}".`)}</Text>
                </View>
              }
            />
          </>
        ) : (
          <FlatList
            key="search-discovery-list"
            data={discoveryCategories}
            keyExtractor={(item) => item.label}
            showsVerticalScrollIndicator={false}
            onScroll={trackFloatingCartScrollDirection}
            scrollEventThrottle={16}
            contentContainerStyle={styles.discoveryList}
            ListHeaderComponent={
              <View style={styles.discoveryHeader}>
                {recentSearches.map((item, index) => (
                  <Pressable
                    key={item}
                    style={[styles.recentItem, index < recentSearches.length - 1 && styles.recentItemBorder]}
                    onPress={() => {
                      setQuery(item);
                    }}
                  >
                    <Clock3 size={20} stroke={colors.muted} strokeWidth={1.8} />
                    <Text style={styles.recentText}>{item}</Text>
                  </Pressable>
                ))}
                <Text style={styles.sectionTitle}>{tr("Tipuri de produse", "Product types")}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.inspirationItem} onPress={() => setActiveCategories([item.label])}>
                <Text style={styles.inspirationEmoji}>{item.emoji}</Text>
                <Text style={styles.inspirationText}>{item.label}</Text>
              </Pressable>
            )}
          />
        )}
      </Animated.View>

      <Modal transparent visible={!!activeSheet} animationType="fade" onRequestClose={() => setActiveSheet(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setActiveSheet(null)} />
        {activeSheet === "allFilters" ? (
          <View style={[styles.bottomSheet, { paddingBottom: sheetPaddingBottom, maxHeight: bottomSheetMaxHeight }]}>
            <View style={styles.sheetHeader}>
              <Pressable hitSlop={10} onPress={() => setActiveSheet(null)}>
                <X size={24} stroke={colors.text} strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.sheetTitle}>{tr("Filtre", "Filters")}</Text>
              <Pressable
                hitSlop={10}
                onPress={() => {
                  resetAllFilters();
                  setActiveSheet(null);
                }}
              >
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.allFiltersScroll}
              showsVerticalScrollIndicator={false}
              onScroll={trackFloatingCartScrollDirection}
              scrollEventThrottle={16}
            >
              <FilterSection title={tr("Sortare", "Sort")} icon={ArrowUpDown}>
                {localizedSheetConfigs.sort.options.map((option, index) => {
                  const selected = isOptionSelected("sort", option.value);
                  return (
                    <Pressable
                      key={option.label}
                      style={[styles.optionRow, index < localizedSheetConfigs.sort.options.length - 1 && styles.optionBorder]}
                      onPress={() => selectOption("sort", option.value)}
                    >
                      <Text style={styles.optionText}>{option.label}</Text>
                      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioInner} /> : null}</View>
                    </Pressable>
                  );
                })}
              </FilterSection>

              <FilterSection title={tr("Oferte", "Offers")} icon={Tag}>
                <Pressable style={styles.toggleRow} onPress={() => setOffersOnly((current) => !current)}>
                  <Text style={styles.toggleText}>{tr("Doar restaurante cu oferte", "Only restaurants with offers")}</Text>
                  <View style={[styles.checkbox, offersOnly && styles.checkboxSelected]}>
                    {offersOnly ? <Check size={14} stroke={colors.white} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              </FilterSection>

              <FilterSection title="Rating" icon={Star}>
                <View style={styles.choiceWrap}>
                  {localizedSheetConfigs.rating.options.map((option) => {
                    const selected = isOptionSelected("rating", option.value);
                    return (
                      <Pressable key={option.label} style={[styles.choiceChip, selected && styles.choiceChipActive]} onPress={() => selectOption("rating", option.value)}>
                        <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FilterSection>

              <FilterSection title={tr("Taxă de livrare", "Delivery fee")} icon={Bike}>
                <View style={styles.choiceWrap}>
                  {localizedSheetConfigs.deliveryFee.options.map((option) => {
                    const selected = isOptionSelected("deliveryFee", option.value);
                    return (
                      <Pressable key={option.label} style={[styles.choiceChip, selected && styles.choiceChipActive]} onPress={() => selectOption("deliveryFee", option.value)}>
                        <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FilterSection>

              <FilterSection title={tr("Timp de livrare", "Delivery time")} icon={Clock3}>
                <View style={styles.choiceWrap}>
                  {localizedSheetConfigs.deliveryTime.options.map((option) => {
                    const selected = isOptionSelected("deliveryTime", option.value);
                    return (
                      <Pressable key={option.label} style={[styles.choiceChip, selected && styles.choiceChipActive]} onPress={() => selectOption("deliveryTime", option.value)}>
                        <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FilterSection>

              <FilterSection title={tr("Ridicare", "Pickup")} icon={Footprints}>
                <Pressable style={styles.toggleRow} onPress={() => setPickupOnly((current) => !current)}>
                  <Text style={styles.toggleText}>{tr("Doar locații cu ridicare disponibilă", "Only locations with pickup available")}</Text>
                  <View style={[styles.checkbox, pickupOnly && styles.checkboxSelected]}>
                    {pickupOnly ? <Check size={14} stroke={colors.white} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              </FilterSection>

              <FilterSection title={tr("Distanță", "Distance")} icon={Route}>
                <View style={styles.choiceWrap}>
                  {localizedSheetConfigs.distance.options.map((option) => {
                    const selected = isOptionSelected("distance", option.value);
                    return (
                      <Pressable key={option.label} style={[styles.choiceChip, selected && styles.choiceChipActive]} onPress={() => selectOption("distance", option.value)}>
                        <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FilterSection>

              <FilterSection title={tr("Categorii", "Categories")} icon={SlidersHorizontal}>
                <View style={styles.categoryList}>
                  {discoveryCategories.map((item, index) => {
                    const selected = activeCategories.includes(item.label);
                    return (
                      <Pressable key={item.label} style={[styles.categoryRow, index < discoveryCategories.length - 1 && styles.optionBorder]} onPress={() => selectOption("categories", item.label)}>
                        <Text style={styles.categoryRowText}>{item.emoji} {item.label}</Text>
                        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                          {selected ? <Check size={14} stroke={colors.white} strokeWidth={3} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </FilterSection>
            </ScrollView>

            <View style={styles.applyWrap}>
              <Pressable style={styles.applyButton} onPress={() => setActiveSheet(null)}>
                <Text style={styles.applyText}>{tr("Aplică", "Apply")}</Text>
              </Pressable>
            </View>
          </View>
        ) : activeSheet && sheetConfig ? (
          <View style={[styles.bottomSheet, { paddingBottom: sheetPaddingBottom, maxHeight: bottomSheetMaxHeight }]}>
            <View style={styles.sheetHeader}>
              <Pressable hitSlop={10} onPress={() => setActiveSheet(null)}>
                <X size={24} stroke={colors.text} strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.sheetTitle}>{sheetConfig.title}</Text>
              <Pressable hitSlop={10} onPress={() => resetFilter(activeSheet)}>
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.singleSheetScroll}
              contentContainerStyle={styles.singleSheetOptionList}
              showsVerticalScrollIndicator={false}
              onScroll={trackFloatingCartScrollDirection}
              scrollEventThrottle={16}
            >
              {sheetConfig.options.map((option, index) => {
                const selected = isOptionSelected(activeSheet, option.value);
                return (
                  <Pressable
                    key={option.label}
                    style={[styles.optionRow, index < sheetConfig.options.length - 1 && styles.optionBorder]}
                    onPress={() => selectOption(activeSheet, option.value)}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.applyWrap}>
              <Pressable style={styles.applyButton} onPress={() => setActiveSheet(null)}>
                <Text style={styles.applyText}>Aplică</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Modal>
    </Screen>
  );
}

function SearchRestaurantResult({
  restaurant,
  products,
  onPress,
  onProductPress,
}: {
  restaurant: Restaurant;
  products: Product[];
  onPress: () => void;
  onProductPress: (product: Product) => void;
}) {
  return (
    <View style={styles.resultBlock}>
      <Pressable style={styles.resultHeader} onPress={onPress}>
        <Image source={{ uri: resolveImageUri(restaurant.cover_image, FALLBACK_RESTAURANT_IMAGE) }} style={styles.resultAvatar} />
        <View style={styles.resultHeaderBody}>
          <View style={styles.resultTitleRow}>
            <Text style={styles.resultRestaurantName} numberOfLines={1}>
              {restaurant.name}
            </Text>
          </View>
          <View style={styles.resultMetaRow}>
            <View style={styles.resultMetaItem}>
              <Bike size={18} stroke={colors.text} strokeWidth={2.4} />
              <Text style={[styles.resultMetaText, styles.resultDeliveryFee]}>{formatRon(restaurant.delivery_fee)}</Text>
            </View>
            <View style={styles.resultMetaItem}>
              <Clock3 size={18} stroke={colors.text} strokeWidth={2.4} />
              <Text style={styles.resultMetaText}>
                {deliveryWindow(restaurant.estimated_delivery_time_min, restaurant.estimated_delivery_time_max)}
              </Text>
            </View>
            <View style={styles.resultMetaItem}>
              <Star size={18} stroke={colors.warning} fill={colors.warning} strokeWidth={2.4} />
              <Text style={styles.resultMetaText}>
                {Number(restaurant.rating).toFixed(1)} ({restaurant.reviews_count ?? 0})
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      <FlatList
        horizontal
        data={products}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <SearchProductCard product={item} onPress={() => onProductPress(item)} />}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.resultProductsRow}
      />
    </View>
  );
}

function SearchProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const effectivePrice = product.effective_price ?? product.discount_price ?? product.price;

  return (
    <Pressable style={styles.searchProductCard} onPress={onPress}>
      <View style={styles.searchProductImageWrap}>
        <Image source={{ uri: resolveImageUri(product.image, FALLBACK_PRODUCT_IMAGE) }} style={styles.searchProductImage} />
      </View>
      <Text style={styles.searchProductPrice}>{formatRon(effectivePrice)}</Text>
      <Text style={styles.searchProductName} numberOfLines={2}>
        {product.name}
      </Text>
    </Pressable>
  );
}

function FilterChip({
  label,
  icon: Icon,
  active,
  redActive,
  dropdown,
  onPress,
}: {
  label: string;
  icon: ChipIcon;
  active: boolean;
  redActive?: boolean;
  dropdown?: boolean;
  onPress: () => void;
}) {
  const useRedActive = active && redActive;
  const iconColor = useRedActive ? colors.white : colors.text;
  const textColor = useRedActive ? colors.white : colors.text;

  return (
    <Pressable style={[styles.filterChip, active && (useRedActive ? styles.filterChipActiveRed : styles.filterChipActive)]} onPress={onPress}>
      <Icon size={16} stroke={iconColor} strokeWidth={2.2} />
      <Text style={[styles.filterChipText, { color: textColor }]}>{label}</Text>
      {dropdown ? <ChevronDown size={15} stroke={iconColor} strokeWidth={2.3} /> : null}
    </Pressable>
  );
}

function FilterSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ChipIcon;
  children: ReactNode;
}) {
  return (
    <View style={styles.filtersSectionCard}>
      <View style={styles.filtersSectionTitleRow}>
        <Icon size={18} stroke={colors.text} strokeWidth={2.3} />
        <Text style={styles.filtersSectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 14,
    gap: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 50,
  },
  searchBar: {
    height: 50,
    borderRadius: 13,
    backgroundColor: "#F0F2F3",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
    flex: 1,
  },
  searchBarFocused: {
    borderWidth: 1.5,
    borderColor: colors.red,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "500",
  },
  cancelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  cancelWrap: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "flex-end",
    height: 50,
  },
  filtersRow: {
    gap: 7,
    paddingRight: 22,
    paddingTop: 8,
    paddingBottom: 0,
  },
  filtersBlock: {
    gap: 10,
  },
  filtersScroll: {
    zIndex: 2,
    elevation: 2,
    backgroundColor: colors.background,
    marginBottom: 0,
  },
  filterChip: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: "#F0F2F3",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  filterChipActive: {
    backgroundColor: "#E4F2EA",
  },
  filterChipActiveRed: {
    backgroundColor: colors.red,
  },
  filterChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  list: {
    paddingBottom: 110,
  },
  resultsList: {
    marginTop: 0,
  },
  resultBlock: {
    gap: 14,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resultAvatar: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.cardSoft,
  },
  resultHeaderBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultRestaurantName: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  resultMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    flexWrap: "wrap",
  },
  resultMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  resultMetaText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "500",
  },
  resultDeliveryFee: {
    color: colors.text,
    fontWeight: "400",
  },
  resultProductsRow: {
    paddingRight: 22,
  },
  searchProductCard: {
    width: 128,
  },
  searchProductImageWrap: {
    width: 128,
    height: 128,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.cardSoft,
    marginBottom: 7,
  },
  searchProductImage: {
    width: "100%",
    height: "100%",
  },
  searchProductPrice: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 1,
  },
  searchProductName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  activeCategoryPill: {
    backgroundColor: colors.cardSoft,
    borderRadius: 999,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeCategoryPillRow: {
    marginTop: 0,
    marginBottom: 0,
  },
  activeCategoriesRow: {
    gap: 8,
    paddingRight: 10,
  },
  activeCategoryEmoji: {
    fontSize: 14,
  },
  activeCategoryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  resultsHeader: {
    marginTop: 14,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultsCountText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  resetResultsButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  resetResultsText: {
    color: colors.red,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingTop: 28,
    gap: 8,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 2,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  discoveryList: {
    paddingTop: 14,
    paddingBottom: 110,
  },
  discoveryHeader: {
    marginBottom: 16,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  recentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "500",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
    marginTop: 30,
    marginBottom: 0,
  },
  inspirationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 12,
  },
  inspirationEmoji: {
    fontSize: 18,
    width: 23,
  },
  inspirationText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  allFiltersScroll: {
    maxHeight: 540,
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: "#EAECEC",
  },
  filtersSectionCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  filtersSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  filtersSectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  sheetHeader: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "500",
  },
  resetText: {
    color: colors.red,
    fontSize: 17,
    fontWeight: "500",
  },
  optionList: {
    paddingHorizontal: 2,
  },
  singleSheetScroll: {
    flexGrow: 0,
  },
  singleSheetOptionList: {
    paddingHorizontal: 20,
  },
  optionRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "400",
  },
  radio: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#9AA3A0",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: colors.red,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.red,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    minHeight: 36,
    borderRadius: 12,
    backgroundColor: "#EAECEC",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  choiceChipActive: {
    backgroundColor: colors.red,
  },
  choiceText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  choiceTextActive: {
    color: colors.white,
  },
  toggleRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "400",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#9AA3A0",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    borderColor: colors.red,
    backgroundColor: colors.red,
  },
  categoryList: {
    borderTopWidth: 1,
    borderTopColor: "#E0E3E3",
    marginTop: 2,
  },
  categoryRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  categoryRowText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "400",
  },
  applyWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  applyButton: {
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  applyText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "500",
  },
  searchFilterBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  searchFilterBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
});
