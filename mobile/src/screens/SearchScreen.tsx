import { NavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import {
  ArrowUpDown,
  Bike,
  Coffee,
  Check,
  ChevronDown,
  Clock3,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  Footprints,
  Fish,
  Heart,
  IceCreamCone,
  Pizza,
  Play,
  Route,
  Salad,
  Search,
  SearchX,
  Sandwich,
  SlidersHorizontal,
  Soup,
  Star,
  Tag,
  X,
} from "lucide-react-native";
import { ComponentType, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, FlatList, Image, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { restaurantsApi } from "../api/restaurantsApi";
import { FoodBackground } from "../components/FoodBackground";
import { getDemoProductVideoSource } from "../data/demoVideos";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { deliveryWindow, money } from "../lib/format";
import { resolveProductImageUri, resolveRestaurantImageUri } from "../lib/images";
import { SearchStackParamList } from "../navigation/types";
import { useFavoritesStore } from "../store/favoritesStore";
import { Product, Restaurant } from "../types/models";

type FilterKey = "sort" | "offers" | "rating" | "deliveryFee" | "deliveryTime" | "pickup" | "distance" | "categories";
type ActiveSheetKey = FilterKey | "allFilters";
type SortValue = "relevant" | "closest" | "deliveryFee" | "deliveryTime" | "rating";
type FilterOption = { label: string; value: string | number | boolean };
type SheetConfig = { title: string; type: "single" | "multi"; options: FilterOption[] };
type ChipIcon = ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;

type DiscoveryCategory = {
  label: string;
  filterValue: string;
  icon: ChipIcon;
  iconColor: string;
  iconBackground: string;
};

const FEED_RESTAURANT_LIMIT = 12;
const FEED_PRODUCT_LIMIT = 3;
const SCREEN_EDGE_GUTTER = 14;

const dark = {
  background: "#050505",
  surface: "#0E0E0F",
  panel: "#151516",
  panelSoft: "#202124",
  border: "rgba(255,255,255,0.14)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.72)",
  faint: "rgba(255,255,255,0.48)",
  accent: "#FF4D45",
  success: "#22C55E",
  warning: "#F6B93B",
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

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const genericProductTypeCatalog: Omit<DiscoveryCategory, "filterValue">[] = [
  { label: "Pizza", icon: Pizza, iconColor: "#F97316", iconBackground: "rgba(249,115,22,0.16)" },
  { label: "Burgeri", icon: Sandwich, iconColor: "#F59E0B", iconBackground: "rgba(245,158,11,0.16)" },
  { label: "Supe", icon: Soup, iconColor: "#FB7185", iconBackground: "rgba(251,113,133,0.16)" },
  { label: "Salate", icon: Salad, iconColor: "#22C55E", iconBackground: "rgba(34,197,94,0.16)" },
  { label: "Desert", icon: IceCreamCone, iconColor: "#A855F7", iconBackground: "rgba(168,85,247,0.16)" },
  { label: "Cafea", icon: Coffee, iconColor: "#C08457", iconBackground: "rgba(192,132,87,0.16)" },
  { label: "Pui", icon: Drumstick, iconColor: "#EF4444", iconBackground: "rgba(239,68,68,0.16)" },
  { label: "Pește", icon: Fish, iconColor: "#0EA5E9", iconBackground: "rgba(14,165,233,0.16)" },
  { label: "Mic dejun", icon: Croissant, iconColor: "#F59E0B", iconBackground: "rgba(245,158,11,0.16)" },
  { label: "Panificație", icon: Cookie, iconColor: "#D97706", iconBackground: "rgba(217,119,6,0.16)" },
  { label: "Băuturi", icon: CupSoda, iconColor: "#06B6D4", iconBackground: "rgba(6,182,212,0.16)" },
];

const categoryVisualCatalog: Array<{ keywords: string[] } & Omit<DiscoveryCategory, "filterValue">> = [
  { label: "Pizza", icon: Pizza, iconColor: "#F97316", iconBackground: "rgba(249,115,22,0.16)", keywords: ["pizza", "pinsa", "focaccia"] },
  { label: "Burgeri", icon: Sandwich, iconColor: "#F59E0B", iconBackground: "rgba(245,158,11,0.16)", keywords: ["burger", "sandwich", "wrap", "shawarma", "kebab"] },
  { label: "Supe", icon: Soup, iconColor: "#FB7185", iconBackground: "rgba(251,113,133,0.16)", keywords: ["soup", "supa", "ciorba", "ramen", "pho", "noodle"] },
  { label: "Salate", icon: Salad, iconColor: "#22C55E", iconBackground: "rgba(34,197,94,0.16)", keywords: ["salad", "salata", "salate", "bowl", "poke", "healthy"] },
  { label: "Desert", icon: IceCreamCone, iconColor: "#A855F7", iconBackground: "rgba(168,85,247,0.16)", keywords: ["dessert", "desert", "cake", "gelato", "ice cream", "donut", "sweet"] },
  { label: "Cafea", icon: Coffee, iconColor: "#C08457", iconBackground: "rgba(192,132,87,0.16)", keywords: ["coffee", "cafea", "espresso", "latte", "cappuccino", "bakery"] },
  { label: "Pui", icon: Drumstick, iconColor: "#EF4444", iconBackground: "rgba(239,68,68,0.16)", keywords: ["chicken", "pui", "wings", "crispy", "strips"] },
  { label: "Pește", icon: Fish, iconColor: "#0EA5E9", iconBackground: "rgba(14,165,233,0.16)", keywords: ["fish", "peste", "pește", "seafood", "salmon", "tuna", "shrimp"] },
  { label: "Mic dejun", icon: Croissant, iconColor: "#F59E0B", iconBackground: "rgba(245,158,11,0.16)", keywords: ["breakfast", "mic dejun", "brunch", "omelette", "pancake", "croissant"] },
  { label: "Panificație", icon: Cookie, iconColor: "#D97706", iconBackground: "rgba(217,119,6,0.16)", keywords: ["bakery", "pastry", "cookie", "cofetarie", "patiserie", "muffin"] },
  { label: "Băuturi", icon: CupSoda, iconColor: "#06B6D4", iconBackground: "rgba(6,182,212,0.16)", keywords: ["drink", "drinks", "bauturi", "băuturi", "juice", "smoothie", "soda", "cocktail"] },
];

function isGenericSelectionLabel(label: string) {
  return /^(selectia|selectie|selection)\s+\d+$/i.test(normalizeText(label.trim()));
}

function resolveDiscoveryCategory(label: string, index = 0): DiscoveryCategory {
  const cleanLabel = label.trim();
  const normalizedLabel = normalizeText(cleanLabel);
  const genericMatch = normalizedLabel.match(/^(selectia|selectie|selection)\s+(\d+)$/);
  if (genericMatch) {
    const fallbackIndex = Math.max(Number(genericMatch[2]) - 1, 0) % genericProductTypeCatalog.length;
    return { ...genericProductTypeCatalog[fallbackIndex], filterValue: cleanLabel };
  }

  const catalogMatch = categoryVisualCatalog.find(({ keywords }) => keywords.some((keyword) => normalizedLabel.includes(keyword)));
  if (catalogMatch) {
    return {
      label: catalogMatch.label,
      filterValue: cleanLabel,
      icon: catalogMatch.icon,
      iconColor: catalogMatch.iconColor,
      iconBackground: catalogMatch.iconBackground,
    };
  }

  const fallbackVisual = genericProductTypeCatalog[index % genericProductTypeCatalog.length];
  return {
    label: cleanLabel,
    filterValue: cleanLabel,
    icon: fallbackVisual.icon,
    iconColor: fallbackVisual.iconColor,
    iconBackground: fallbackVisual.iconBackground,
  };
}

const buildFallbackProduct = (restaurant: Restaurant): Product => ({
  id: restaurant.id * 10000,
  restaurant: restaurant.id,
  restaurant_name: restaurant.name,
  category: null,
  category_name: "Chef pick",
  name: `${restaurant.name} tasting plate`,
  description: restaurant.description || "Mock video dish prepared for the new swipe-first feed.",
  image: null,
  price: Number(restaurant.minimum_order || 49) || 49,
  discount_price: null,
  effective_price: Number(restaurant.minimum_order || 49) || 49,
  is_available: true,
  is_popular: true,
  preparation_time: restaurant.estimated_delivery_time_min || 20,
  allergens: "",
  option_groups: [],
});

const compactCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
};

const searchProductViews = (restaurant: Restaurant, product: Product) => {
  const seed = restaurant.id * 53 + product.id * 19;
  return 1800 + (seed % 91) * 173;
};

const videoSourceForSearchProduct = (_restaurant: Restaurant, product: Product, fallbackIndex: number): VideoSource => {
  if (product.video_url) {
    return {
      uri: product.video_url,
      contentType: "progressive",
      useCaching: true,
    };
  }

  return getDemoProductVideoSource(fallbackIndex);
};

function buildDiscoveryCategories(restaurants: Restaurant[], products: Product[]) {
  const byKey = new Map<string, { label: string; score: number }>();
  const addCategory = (label: string | undefined, score: number) => {
    const cleanLabel = label?.trim();
    if (!cleanLabel) return;
    const key = normalizeText(cleanLabel);
    const current = byKey.get(key);
    byKey.set(key, { label: current?.label ?? cleanLabel, score: (current?.score ?? 0) + score });
  };


  products.forEach((product) => addCategory(product.category_name, 3));
  if (byKey.size === 0) {
    restaurants.forEach((restaurant) => {
      restaurant.categories?.forEach((category) => addCategory(category.name, 2));
    });
  }

  const rankedCategories = [...byKey.values()]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 24);

  const hasOnlyGenericSelections = rankedCategories.length > 0 && rankedCategories.every((item) => isGenericSelectionLabel(item.label));
  if (hasOnlyGenericSelections) {
    return genericProductTypeCatalog.map((item) => ({
      ...item,
      filterValue: item.label,
    }));
  }

  return rankedCategories.map((item, index) => resolveDiscoveryCategory(item.label, index));
}

export function SearchScreen() {
  const { tr } = useI18n();
  const navigation = useNavigation<NavigationProp<SearchStackParamList>>();
  const route = useRoute<RouteProp<SearchStackParamList, "SearchHome">>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const favoriteRestaurantIds = useFavoritesStore((state) => state.restaurantIds);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortValue>("relevant");
  const [offersOnly, setOffersOnly] = useState(false);
  const [pickupOnly, setPickupOnly] = useState(false);
  const [minimumRating, setMinimumRating] = useState<number | null>(null);
  const [maximumDeliveryFee, setMaximumDeliveryFee] = useState<number | null>(null);
  const [maximumDeliveryTime, setMaximumDeliveryTime] = useState<number | null>(null);
  const [maximumDistance, setMaximumDistance] = useState<number | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeCategories, setActiveCategories] = useState<string[]>(route.params?.category ? [route.params.category] : []);
  const [activeSheet, setActiveSheet] = useState<ActiveSheetKey | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFocusedFromHome, setIsFocusedFromHome] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const entryAnimation = useRef(new Animated.Value(1)).current;
  const focusAnimation = useRef(new Animated.Value(0)).current;
  const resultsRevealAnimation = useRef(new Animated.Value(1)).current;
  const discoveryRevealAnimation = useRef(new Animated.Value(1)).current;
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();
  const sheetPaddingBottom = Math.max(insets.bottom, 18) + 14;
  const bottomSheetMaxHeight = Math.max(320, windowHeight - insets.top - 24);
  const feedRestaurantIds = useMemo(() => new Set(restaurants.map((restaurant) => restaurant.id)), [restaurants]);
  const feedProducts = useMemo(
    () => products.filter((product) => feedRestaurantIds.has(Number(product.restaurant))),
    [feedRestaurantIds, products],
  );
  const feedProductsByRestaurant = useMemo(() => {
    const grouped = new Map<number, Product[]>();
    feedProducts.forEach((product) => {
      const restaurantProducts = grouped.get(product.restaurant) ?? [];
      grouped.set(product.restaurant, [...restaurantProducts, product]);
    });
    return grouped;
  }, [feedProducts]);
  const feedDiscoveryCategories = useMemo(
    () => buildDiscoveryCategories(restaurants, feedProducts),
    [feedProducts, restaurants],
  );
  const discoveryCategoryByFilterValue = useMemo(
    () => new Map(feedDiscoveryCategories.map((item) => [item.filterValue, item])),
    [feedDiscoveryCategories],
  );
  const discoveryRestaurants = useMemo(() => restaurants.slice(0, 5), [restaurants]);

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
        options: feedDiscoveryCategories.map((item) => ({ label: item.label, value: item.filterValue })),
      },
    }),
    [feedDiscoveryCategories, tr],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSearchData() {
      setIsLoading(true);
      try {
        const feedRestaurants = await restaurantsApi.list({ ordering: "-rating" });
        const openRestaurants = feedRestaurants.filter((restaurant) => restaurant.is_open !== false);
        const visibleRestaurants = openRestaurants.slice(0, FEED_RESTAURANT_LIMIT);
        const productEntries = await Promise.all(
          visibleRestaurants.map(async (restaurant) => {
            const restaurantProducts = (await restaurantsApi.products(restaurant.id))
              .filter((product) => Number(product.restaurant) === restaurant.id)
              .slice(0, FEED_PRODUCT_LIMIT);
            return [
              restaurant,
              restaurantProducts.length ? restaurantProducts : [buildFallbackProduct(restaurant)],
            ] as const;
          }),
        );

        if (!isMounted) return;
        setRestaurants(productEntries.map(([restaurant]) => restaurant));
        setProducts(productEntries.flatMap(([, restaurantProducts]) => restaurantProducts));
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    }

    loadSearchData();

    return () => {
      isMounted = false;
    };
  }, [favoriteRestaurantIds]);

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

  const hasSearchIntent = query.trim().length > 0 || activeCategories.length > 0 || favoritesOnly;

  useEffect(() => {
    if (isLoading || !hasSearchIntent) return;
    resultsRevealAnimation.setValue(0);
    Animated.timing(resultsRevealAnimation, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [
    activeCategories,
    favoritesOnly,
    hasSearchIntent,
    isLoading,
    maximumDeliveryFee,
    maximumDeliveryTime,
    maximumDistance,
    minimumRating,
    offersOnly,
    pickupOnly,
    query,
    resultsRevealAnimation,
    sort,
  ]);

  useEffect(() => {
    if (isLoading || hasSearchIntent) return;
    discoveryRevealAnimation.setValue(0);
    Animated.timing(discoveryRevealAnimation, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [discoveryRevealAnimation, hasSearchIntent, isLoading]);

  const restaurantMatchesSearchQuery = (restaurant: Restaurant, queryText: string) => {
    const restaurantHaystack = normalizeText(`${restaurant.name} ${restaurant.description} ${(restaurant.categories ?? []).map((c) => c.name).join(" ")}`);
    return !queryText || restaurantHaystack.includes(queryText);
  };

  const productMatchesSearchContext = (product: Product, queryText: string) => {
    const productHaystack = normalizeText(`${product.name} ${product.description} ${product.restaurant_name ?? ""} ${product.category_name ?? ""}`);
    const matchesQuery = !queryText || productHaystack.includes(queryText);
    const matchesCategory =
      activeCategories.length === 0 || activeCategories.some((category) => productHaystack.includes(normalizeText(category)));

    return matchesQuery && matchesCategory;
  };

  const getRestaurantProductsForSearch = (restaurant: Restaurant) => {
    const queryText = normalizeText(query.trim());
    const restaurantProducts = feedProductsByRestaurant.get(restaurant.id) ?? [];
    const matchingProducts = restaurantProducts.filter((product) => productMatchesSearchContext(product, queryText));

    if (matchingProducts.length > 0) return matchingProducts.slice(0, FEED_PRODUCT_LIMIT);
    if (activeCategories.length === 0 && restaurantMatchesSearchQuery(restaurant, queryText)) {
      return restaurantProducts.slice(0, FEED_PRODUCT_LIMIT);
    }
    return [];
  };

  const filtered = useMemo(() => {
    if (!hasSearchIntent) return [];
    const queryText = normalizeText(query.trim());
    const feedOrder = new Map(restaurants.map((restaurant, index) => [restaurant.id, index]));

    return restaurants
      .filter((restaurant) => {
        const restaurantProducts = feedProductsByRestaurant.get(restaurant.id) ?? [];
        const hasMatchingProducts = restaurantProducts.some((product) => productMatchesSearchContext(product, queryText));
        const matchesRestaurantQuery = restaurantMatchesSearchQuery(restaurant, queryText);
        const matchesQuery = !queryText || matchesRestaurantQuery || hasMatchingProducts;
        const matchesCategory = activeCategories.length === 0 || hasMatchingProducts;
        const matchesOffers = !offersOnly || !!restaurant.has_offer;
        const matchesPickup = !pickupOnly || !!restaurant.supports_pickup;
        const matchesRating = minimumRating === null || Number(restaurant.rating) >= minimumRating;
        const matchesDeliveryFee = maximumDeliveryFee === null || Number(restaurant.delivery_fee) <= maximumDeliveryFee;
        const matchesDeliveryTime = maximumDeliveryTime === null || restaurant.estimated_delivery_time_min <= maximumDeliveryTime;
        const matchesDistance = maximumDistance === null || Number(restaurant.distance_km ?? 99) <= maximumDistance;
        const matchesFavorites = !favoritesOnly || favoriteRestaurantIds.includes(restaurant.id);

        return (
          matchesQuery &&
          matchesCategory &&
          matchesOffers &&
          matchesPickup &&
          matchesRating &&
          matchesDeliveryFee &&
          matchesDeliveryTime &&
          matchesDistance &&
          matchesFavorites
        );
      })
      .sort((a, b) => {
        if (sort === "closest") return Number(a.distance_km ?? 99) - Number(b.distance_km ?? 99);
        if (sort === "deliveryFee") return Number(a.delivery_fee) - Number(b.delivery_fee);
        if (sort === "deliveryTime") return a.estimated_delivery_time_min - b.estimated_delivery_time_min;
        if (sort === "rating") return Number(b.rating) - Number(a.rating);
        return (feedOrder.get(a.id) ?? 999) - (feedOrder.get(b.id) ?? 999);
      });
  }, [activeCategories, favoriteRestaurantIds, favoritesOnly, feedProductsByRestaurant, hasSearchIntent, maximumDeliveryFee, maximumDeliveryTime, maximumDistance, minimumRating, offersOnly, pickupOnly, query, restaurants, sort]);

  const commitRecentSearch = () => {
    const value = query.trim();
    if (!value) return;
    setRecentSearches((prev) => [value, ...prev.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8));
  };

  const clearSearchContext = () => {
    setQuery("");
    setActiveCategories([]);
    setFavoritesOnly(false);
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

  const emptyQueryLabel =
    query.trim() ||
    activeCategories.map((category) => discoveryCategoryByFilterValue.get(category)?.label ?? category).join(", ") ||
    "selecția curentă";
  const sheetConfig = activeSheet && activeSheet !== "allFilters" ? localizedSheetConfigs[activeSheet] : null;
  const activeFiltersCount =
    (sort !== "relevant" ? 1 : 0) +
    (offersOnly ? 1 : 0) +
    (pickupOnly ? 1 : 0) +
    (minimumRating !== null ? 1 : 0) +
    (maximumDeliveryFee !== null ? 1 : 0) +
    (maximumDeliveryTime !== null ? 1 : 0) +
    (maximumDistance !== null ? 1 : 0) +
    (activeCategories.length > 0 ? 1 : 0) +
    (favoritesOnly ? 1 : 0);

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
    setFavoritesOnly(false);
  };

  return (
    <View style={styles.screen}>
      <FoodBackground />
      <Animated.View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 12,
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
            <Search size={23} stroke={dark.text} strokeWidth={2.6} />
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
              placeholderTextColor={dark.faint}
              style={styles.searchInput}
            />
            {!isFocusedFromHome ? (
              <Pressable hitSlop={8} onPress={() => setActiveSheet("allFilters")}>
                <SlidersHorizontal size={22} stroke={dark.text} strokeWidth={2.7} />
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
                    <View style={[styles.categoryIconWrap, { backgroundColor: discoveryCategoryByFilterValue.get(category)?.iconBackground ?? "rgba(255,255,255,0.10)" }]}>
                      {(() => {
                        const categoryPresentation = discoveryCategoryByFilterValue.get(category) ?? resolveDiscoveryCategory(category);
                        const CategoryIcon = categoryPresentation.icon;
                        return <CategoryIcon size={15} stroke={categoryPresentation.iconColor} strokeWidth={2.1} />;
                      })()}
                    </View>
                    <Text style={styles.activeCategoryText}>{discoveryCategoryByFilterValue.get(category)?.label ?? category}</Text>
                    <Pressable hitSlop={8} onPress={() => setActiveCategories((current) => current.filter((item) => item !== category))}>
                      <X size={14} stroke={dark.text} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {isLoading ? (
          hasSearchIntent ? (
            <SearchResultsSkeleton />
          ) : (
            <SearchDiscoverySkeleton />
          )
        ) : hasSearchIntent ? (
          <Animated.View
            style={[
              styles.resultsAnimatedWrap,
              {
                opacity: resultsRevealAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.62, 1],
                }),
                transform: [
                  {
                    translateY: resultsRevealAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
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
              renderItem={({ item }) => {
                const restaurantProducts = getRestaurantProductsForSearch(item);
                const feedRestaurantProducts = feedProductsByRestaurant.get(item.id) ?? restaurantProducts;
                return (
                  <SearchRestaurantResult
                    restaurant={item}
                    products={restaurantProducts}
                    mediaProducts={feedRestaurantProducts}
                    onPress={() =>
                      navigation.navigate("RestaurantDetails", { restaurant: item, products: feedRestaurantProducts })
                    }
                    onProductPress={(product, mediaFallbackIndex) => {
                      navigation.navigate("ProductDetails", { restaurant: item, product, mediaFallbackIndex });
                    }}
                  />
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 34 }} />}
              showsVerticalScrollIndicator={false}
              onScroll={trackFloatingCartScrollDirection}
              scrollEventThrottle={16}
              contentContainerStyle={[styles.list, filtered.length === 0 && styles.emptyResultsList]}
              ListEmptyComponent={
                <SearchEmptyState
                  title={tr("Oops, niciun rezultat", "Oops, no results")}
                  subtitle={tr(`Nu există rezultate pentru „${emptyQueryLabel}”.`, `No results for "${emptyQueryLabel}".`)}
                />
              }
            />
          </Animated.View>
        ) : (
          <Animated.View
            style={[
              styles.resultsAnimatedWrap,
              {
                opacity: discoveryRevealAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
                transform: [
                  {
                    translateY: discoveryRevealAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <FlatList
              key="search-discovery-list"
              data={feedDiscoveryCategories}
              keyExtractor={(item) => item.filterValue}
              showsVerticalScrollIndicator={false}
              onScroll={trackFloatingCartScrollDirection}
              scrollEventThrottle={16}
              contentContainerStyle={styles.discoveryList}
              ListHeaderComponent={
                <View style={styles.discoveryHeader}>
                {recentSearches.length > 0 ? (
                  <>
                    <Text style={styles.sectionTitle}>{tr("Căutări recente", "Recent searches")}</Text>
                    {recentSearches.map((item, index) => (
                      <Pressable
                        key={item}
                        style={[styles.recentItem, index < recentSearches.length - 1 && styles.recentItemBorder]}
                        onPress={() => {
                          setQuery(item);
                        }}
                      >
                        <Clock3 size={20} stroke={dark.faint} strokeWidth={1.8} />
                        <Text style={styles.recentText}>{item}</Text>
                      </Pressable>
                    ))}
                  </>
                ) : null}

                {discoveryRestaurants.length > 0 ? (
                  <>
                    <Text style={styles.sectionTitle}>{tr("Recomandate", "Recommended")}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedRestaurantsRow}>
                      {discoveryRestaurants.map((restaurant) => (
                        <Pressable
                          key={restaurant.id}
                          style={styles.feedRestaurantCard}
                          onPress={() =>
                            navigation.navigate("RestaurantDetails", {
                              restaurant,
                              products: feedProductsByRestaurant.get(restaurant.id) ?? [],
                            })
                          }
                        >
                          <View style={styles.feedRestaurantImageWrap}>
                            <Image
                              source={{ uri: resolveRestaurantImageUri(restaurant.logo || restaurant.cover_image, restaurant.id, restaurant) }}
                              style={styles.feedRestaurantImage}
                              resizeMode="cover"
                            />
                          </View>
                          <Text numberOfLines={1} style={styles.feedRestaurantName}>{restaurant.name}</Text>
                          <Text numberOfLines={1} style={styles.feedRestaurantMeta}>
                            {Number(restaurant.rating).toFixed(1)} ★ · {restaurant.estimated_delivery_time_min}-{restaurant.estimated_delivery_time_max} min
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                ) : null}

                {favoriteRestaurantIds.length > 0 ? (
                  <>
                    <Text style={styles.sectionTitle}>{tr("Favoritele tale", "Your favorites")}</Text>
                    <Pressable
                      style={styles.recentItem}
                      onPress={() => {
                        setFavoritesOnly(true);
                        setQuery("");
                        setActiveCategories([]);
                      }}
                    >
                      <Heart size={20} stroke={dark.accent} strokeWidth={1.8} fill={dark.accent} />
                      <Text style={styles.recentText}>
                        {tr("Restaurante favorite", "Favorite restaurants")} ({favoriteRestaurantIds.length})
                      </Text>
                    </Pressable>
                  </>
                ) : null}

                <Text style={[styles.sectionTitle, styles.productTypesSectionTitle]}>{tr("Tipuri de produse", "Product types")}</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.inspirationItem} onPress={() => setActiveCategories([item.filterValue])}>
                  <View style={[styles.categoryIconWrap, { backgroundColor: item.iconBackground }]}>
                    <item.icon size={18} stroke={item.iconColor} strokeWidth={2.1} />
                  </View>
                  <Text style={styles.inspirationText}>{item.label}</Text>
                </Pressable>
              )}
            />
          </Animated.View>
        )}
      </Animated.View>

      <Modal transparent visible={!!activeSheet} animationType="fade" onRequestClose={() => setActiveSheet(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setActiveSheet(null)} />
        {activeSheet === "allFilters" ? (
          <View style={[styles.bottomSheet, { paddingBottom: sheetPaddingBottom, maxHeight: bottomSheetMaxHeight }]}>
            <View style={styles.sheetHeader}>
              <Pressable hitSlop={10} onPress={() => setActiveSheet(null)}>
                <X size={24} stroke={dark.text} strokeWidth={2.5} />
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
                    {offersOnly ? <Check size={14} stroke={dark.text} strokeWidth={3} /> : null}
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
                    {pickupOnly ? <Check size={14} stroke={dark.text} strokeWidth={3} /> : null}
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
                  {feedDiscoveryCategories.map((item, index) => {
                    const selected = activeCategories.includes(item.filterValue);
                    return (
                      <Pressable key={item.filterValue} style={[styles.categoryRow, index < feedDiscoveryCategories.length - 1 && styles.optionBorder]} onPress={() => selectOption("categories", item.filterValue)}>
                        <View style={styles.categoryRowLabel}>
                          <View style={[styles.categoryIconWrap, { backgroundColor: item.iconBackground }]}>
                            <item.icon size={17} stroke={item.iconColor} strokeWidth={2.1} />
                          </View>
                          <Text style={styles.categoryRowText}>{item.label}</Text>
                        </View>
                        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                          {selected ? <Check size={14} stroke={dark.text} strokeWidth={3} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </FilterSection>
            </ScrollView>

            <View style={styles.applyWrap}>
              <Pressable style={styles.applyButton} onPress={() => setActiveSheet(null)}>
                <Check size={16} stroke={dark.success} strokeWidth={2.8} />
                <Text style={styles.applyText}>{tr("Aplică", "Apply")}</Text>
              </Pressable>
            </View>
          </View>
        ) : activeSheet && sheetConfig ? (
          <View style={[styles.bottomSheet, { paddingBottom: sheetPaddingBottom, maxHeight: bottomSheetMaxHeight }]}>
            <View style={styles.sheetHeader}>
              <Pressable hitSlop={10} onPress={() => setActiveSheet(null)}>
                <X size={24} stroke={dark.text} strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.sheetTitle}>{sheetConfig.title}</Text>
              <Pressable
                hitSlop={10}
                onPress={() => {
                  resetFilter(activeSheet);
                  setActiveSheet(null);
                }}
              >
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
                <Check size={16} stroke={dark.success} strokeWidth={2.8} />
                <Text style={styles.applyText}>{tr("Aplică", "Apply")}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function SearchResultsSkeleton() {
  return (
    <View style={styles.searchSkeletonWrap}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={`search-result-skeleton-${index}`} style={styles.searchResultSkeleton}>
          <View style={styles.searchResultSkeletonHeader}>
            <View style={styles.searchResultSkeletonAvatar} />
            <View style={styles.searchResultSkeletonLines}>
              <View style={styles.searchResultSkeletonLineLg} />
              <View style={styles.searchResultSkeletonLineSm} />
            </View>
          </View>
          <View style={styles.searchResultSkeletonProductsRow}>
            {Array.from({ length: 3 }).map((__, productIndex) => (
              <View key={`search-product-skeleton-${index}-${productIndex}`} style={styles.searchResultSkeletonProduct} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function SearchDiscoverySkeleton() {
  return (
    <View style={styles.discoverySkeletonWrap}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={`recent-skeleton-${index}`} style={styles.recentSkeletonRow} />
      ))}
      <View style={styles.discoveryTitleSkeleton} />
      {Array.from({ length: 10 }).map((_, index) => (
        <View key={`discovery-item-skeleton-${index}`} style={styles.discoveryItemSkeleton} />
      ))}
    </View>
  );
}

function SearchRestaurantResult({
  restaurant,
  products,
  mediaProducts,
  onPress,
  onProductPress,
}: {
  restaurant: Restaurant;
  products: Product[];
  mediaProducts: Product[];
  onPress: () => void;
  onProductPress: (product: Product, mediaFallbackIndex: number) => void;
}) {
  return (
    <View style={styles.resultBlock}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(14,14,15,0)", "rgba(14,14,15,0.08)", "rgba(14,14,15,0.12)", "rgba(14,14,15,0.08)", "rgba(14,14,15,0)"]}
        locations={[0, 0.24, 0.5, 0.76, 1]}
        style={styles.resultOverlay}
      />
      <Pressable style={styles.resultHeader} onPress={onPress}>
        <Image source={{ uri: resolveRestaurantImageUri(restaurant.logo || restaurant.cover_image, restaurant.id, restaurant) }} style={styles.resultAvatar} />
        <View style={styles.resultHeaderBody}>
          <View style={styles.resultTitleRow}>
            <Text style={styles.resultRestaurantName} numberOfLines={1}>
              {restaurant.name}
            </Text>
          </View>
          <View style={styles.resultMetaRow}>
            <View style={styles.resultMetaItem}>
              <Bike size={18} stroke={dark.muted} strokeWidth={2.4} />
              <Text style={[styles.resultMetaText, styles.resultDeliveryFee]}>{money(restaurant.delivery_fee)}</Text>
            </View>
            <View style={styles.resultMetaItem}>
              <Clock3 size={18} stroke={dark.muted} strokeWidth={2.4} />
              <Text style={styles.resultMetaText}>
                {deliveryWindow(restaurant.estimated_delivery_time_min, restaurant.estimated_delivery_time_max)}
              </Text>
            </View>
            <View style={styles.resultMetaItem}>
              <Star size={18} stroke={dark.warning} fill={dark.warning} strokeWidth={2.4} />
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
        renderItem={({ item, index }) => {
          const canonicalIndex = mediaProducts.findIndex((product) => product.id === item.id);
          const mediaFallbackIndex = (restaurant.id - 1) * 10 + Math.max(canonicalIndex, index, 0);
          return (
            <SearchProductCard
              product={item}
              restaurant={restaurant}
              mediaFallbackIndex={mediaFallbackIndex}
              onPress={() => onProductPress(item, mediaFallbackIndex)}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.resultProductsRow}
      />
    </View>
  );
}

function SearchProductCard({
  product,
  restaurant,
  mediaFallbackIndex,
  onPress,
}: {
  product: Product;
  restaurant: Restaurant;
  mediaFallbackIndex: number;
  onPress: () => void;
}) {
  const videoSource = useMemo(
    () => videoSourceForSearchProduct(restaurant, product, mediaFallbackIndex),
    [mediaFallbackIndex, product, restaurant],
  );
  const effectivePrice = product.effective_price ?? product.discount_price ?? product.price;
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false);
  const player = useVideoPlayer(videoSource, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.volume = 0;
    videoPlayer.audioMixingMode = "mixWithOthers";
  });

  useEffect(() => {
    try {
      player.play();
    } catch {
      // Search result previews remain tappable even if native autoplay is unavailable.
    }

    return () => {
      try {
        player.pause();
      } catch {
        // Ignore cleanup failures from native video state.
      }
    };
  }, [player]);

  useEffect(() => {
    setHasRenderedFrame(false);
  }, [videoSource]);

  return (
    <Pressable style={styles.searchProductCard} onPress={onPress}>
      <View style={styles.searchProductVideoWrap}>
        <VideoView
          player={player}
          style={styles.searchProductVideo}
          contentFit="cover"
          nativeControls={false}
          fullscreenOptions={{ enable: false }}
          allowsPictureInPicture={false}
          playsInline
          pointerEvents="none"
          surfaceType="textureView"
          useExoShutter={false}
          onFirstFrameRender={() => setHasRenderedFrame(true)}
        />
        {!hasRenderedFrame ? <View pointerEvents="none" style={styles.searchProductVideoSkeleton} /> : null}
        <View style={styles.searchProductVideoShade} />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.24)", "rgba(0,0,0,0.56)"]}
          locations={[0, 0.45, 1]}
          style={styles.searchProductCaptionShade}
        />
        <View style={styles.searchProductViewsBadge}>
          <Play size={10} stroke={dark.text} fill={dark.text} />
          <Text style={styles.searchProductViewsText}>{compactCount(searchProductViews(restaurant, product))}</Text>
        </View>
        <View style={styles.searchProductCaption}>
          <Text style={styles.searchProductName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.searchProductPrice}>{money(effectivePrice)}</Text>
          <View style={styles.searchProductPriceAccent} />
        </View>
      </View>
    </Pressable>
  );
}

function SearchEmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [appear]);

  return (
    <Animated.View
      style={[
        styles.emptyState,
        {
          opacity: appear,
          transform: [
            {
              translateY: appear.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
            {
              scale: appear.interpolate({
                inputRange: [0, 1],
                outputRange: [0.97, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.emptyIconWrap}>
        <SearchX size={24} stroke={dark.muted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{subtitle}</Text>
    </Animated.View>
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
  const iconColor = active ? dark.text : dark.muted;
  const textColor = useRedActive ? dark.text : dark.text;
  const activeChipStyle = active
    ? useRedActive
      ? styles.filterChipActiveRed
      : styles.filterChipActive
    : null;

  return (
    <Pressable style={[styles.filterChip, activeChipStyle]} onPress={onPress}>
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
        <Icon size={18} stroke={dark.text} strokeWidth={2.3} />
        <Text style={styles.filtersSectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: dark.background,
  },
  container: {
    flex: 1,
    gap: 10,
    backgroundColor: "transparent",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: SCREEN_EDGE_GUTTER,
  },
  searchBar: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 9,
    flex: 1,
  },
  searchBarFocused: {
    borderColor: dark.success,
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  searchInput: {
    flex: 1,
    color: dark.text,
    fontSize: 15,
    fontWeight: "400",
    paddingVertical: 0,
  },
  cancelText: {
    color: dark.text,
    fontSize: 15,
    fontWeight: "500",
  },
  cancelWrap: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "flex-end",
    height: 50,
  },
  filtersBlock: {
    gap: 10,
  },
  filtersScroll: {
    zIndex: 2,
    elevation: 2,
    backgroundColor: "transparent",
    marginBottom: 0,
  },
  filtersRow: {
    gap: 7,
    paddingHorizontal: SCREEN_EDGE_GUTTER,
    paddingTop: 8,
  },
  filterChip: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  filterChipActive: {
    backgroundColor: "rgba(34,197,94,0.16)",
    borderColor: dark.success,
  },
  filterChipActiveRed: {
    backgroundColor: "rgba(34,197,94,0.16)",
    borderColor: dark.success,
  },
  filterChipText: {
    color: dark.text,
    fontSize: 14,
    fontWeight: "500",
  },
  activeCategoryPillRow: {
    marginTop: 0,
  },
  activeCategoriesRow: {
    gap: 8,
    paddingHorizontal: SCREEN_EDGE_GUTTER,
  },
  activeCategoryPill: {
    backgroundColor: "rgba(21,21,22,0.84)",
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 999,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeCategoryText: {
    color: dark.text,
    fontSize: 14,
    fontWeight: "500",
  },
  list: {
    paddingBottom: 116,
  },
  emptyResultsList: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 150,
  },
  resultsList: {
    marginTop: 0,
  },
  resultsAnimatedWrap: {
    flex: 1,
  },
  resultsHeader: {
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: SCREEN_EDGE_GUTTER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultsCountText: {
    color: dark.text,
    fontSize: 18,
    fontWeight: "600",
  },
  resetResultsButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  resetResultsText: {
    color: dark.success,
    fontSize: 16,
    fontWeight: "600",
  },
  resultBlock: {
    gap: 14,
    borderRadius: 0,
    backgroundColor: "transparent",
    position: "relative",
    padding: 12,
    paddingHorizontal: 0,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: SCREEN_EDGE_GUTTER,
  },
  resultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: dark.text,
    backgroundColor: dark.panelSoft,
  },
  resultHeaderBody: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultRestaurantName: {
    flexShrink: 1,
    color: dark.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  resultMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  resultMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  resultMetaText: {
    color: dark.muted,
    fontSize: 12,
    fontWeight: "500",
  },
  resultDeliveryFee: {
    color: dark.text,
  },
  resultProductsRow: {
    paddingLeft: SCREEN_EDGE_GUTTER,
  },
  searchProductCard: {
    width: 132,
  },
  searchProductVideoWrap: {
    width: 132,
    height: 188,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: dark.panel,
  },
  searchProductVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  searchProductVideoSkeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  searchProductVideoShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.20)",
  },
  searchProductCaptionShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 92,
  },
  searchProductPrice: {
    color: dark.text,
    fontSize: 12,
    fontWeight: "700",
  },
  searchProductPriceAccent: {
    width: 26,
    height: 2,
    borderRadius: 999,
    backgroundColor: dark.success,
    marginTop: 2,
  },
  searchProductViewsBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    minHeight: 22,
    borderRadius: 999,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.54)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  searchProductViewsText: {
    color: dark.text,
    fontSize: 10,
    fontWeight: "700",
  },
  searchProductCaption: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    gap: 2,
  },
  searchProductName: {
    color: dark.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: dark.panel,
    borderWidth: 1,
    borderColor: dark.border,
    marginBottom: 2,
  },
  emptyTitle: {
    color: dark.text,
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: dark.muted,
    fontSize: 14,
    textAlign: "center",
  },
  discoveryList: {
    paddingTop: 10,
    paddingBottom: 116,
  },
  discoveryHeader: {
    marginBottom: 14,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SCREEN_EDGE_GUTTER,
    paddingVertical: 13,
  },
  recentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
  },
  recentText: {
    color: dark.text,
    fontSize: 16,
    fontWeight: "500",
  },
  sectionTitle: {
    color: dark.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "700",
    paddingHorizontal: SCREEN_EDGE_GUTTER,
    marginTop: 24,
    marginBottom: 12,
  },
  productTypesSectionTitle: {
    marginTop: 34,
  },
  feedRestaurantsRow: {
    gap: 10,
    paddingHorizontal: SCREEN_EDGE_GUTTER,
  },
  feedRestaurantCard: {
    width: 132,
  },
  feedRestaurantImageWrap: {
    width: "100%",
    height: 94,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#1E1F21",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  feedRestaurantImage: {
    ...StyleSheet.absoluteFillObject,
  },
  feedRestaurantName: {
    color: dark.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  feedRestaurantMeta: {
    marginTop: 2,
    color: dark.faint,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
  },
  inspirationItem: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "transparent",
    marginHorizontal: SCREEN_EDGE_GUTTER,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  inspirationText: {
    color: dark.text,
    fontSize: 16,
    fontWeight: "500",
  },
  categoryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryRowLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: dark.surface,
    overflow: "hidden",
  },
  allFiltersScroll: {
    maxHeight: 540,
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: dark.surface,
  },
  filtersSectionCard: {
    backgroundColor: dark.surface,
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
    color: dark.text,
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
    borderBottomColor: dark.border,
    backgroundColor: dark.surface,
  },
  sheetTitle: {
    color: dark.text,
    fontSize: 18,
    fontWeight: "600",
  },
  resetText: {
    color: dark.success,
    fontSize: 17,
    fontWeight: "500",
  },
  singleSheetScroll: {
    flexGrow: 0,
    backgroundColor: dark.surface,
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
    borderBottomColor: dark.border,
  },
  optionText: {
    color: dark.text,
    fontSize: 16,
    fontWeight: "400",
    flex: 1,
  },
  radio: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: dark.success,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: dark.success,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    minHeight: 36,
    borderRadius: 12,
    backgroundColor: dark.panel,
    borderWidth: 1,
    borderColor: dark.border,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  choiceChipActive: {
    backgroundColor: "rgba(34,197,94,0.16)",
    borderColor: dark.success,
  },
  choiceText: {
    color: dark.text,
    fontSize: 15,
    fontWeight: "500",
  },
  choiceTextActive: {
    color: dark.text,
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
    color: dark.text,
    fontSize: 16,
    fontWeight: "400",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    borderColor: dark.success,
    backgroundColor: dark.success,
  },
  categoryList: {
    borderTopWidth: 1,
    borderTopColor: dark.border,
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
    color: dark.text,
    fontSize: 16,
    fontWeight: "400",
    flex: 1,
  },
  applyWrap: {
    paddingHorizontal: 20,
    paddingTop: 22,
    backgroundColor: dark.surface,
    alignItems: "flex-end",
  },
  applyButton: {
    minWidth: 112,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.55)",
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 16,
  },
  applyText: {
    color: dark.success,
    fontSize: 14,
    fontWeight: "700",
  },
  searchFilterBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: dark.success,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  searchFilterBadgeText: {
    color: dark.text,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
  searchSkeletonWrap: {
    paddingTop: 14,
    paddingBottom: 110,
    gap: 18,
  },
  searchResultSkeleton: {
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: "rgba(14,14,15,0.76)",
    padding: 12,
  },
  searchResultSkeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchResultSkeletonAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: dark.panelSoft,
  },
  searchResultSkeletonLines: {
    flex: 1,
    gap: 8,
  },
  searchResultSkeletonLineLg: {
    width: "62%",
    height: 14,
    borderRadius: 7,
    backgroundColor: dark.panelSoft,
  },
  searchResultSkeletonLineSm: {
    width: "38%",
    height: 12,
    borderRadius: 6,
    backgroundColor: dark.panelSoft,
  },
  searchResultSkeletonProductsRow: {
    flexDirection: "row",
    gap: 12,
  },
  searchResultSkeletonProduct: {
    width: 122,
    height: 204,
    borderRadius: 8,
    backgroundColor: dark.panelSoft,
  },
  discoverySkeletonWrap: {
    paddingTop: 14,
    paddingBottom: 110,
    gap: 12,
  },
  recentSkeletonRow: {
    height: 44,
    borderRadius: 12,
    backgroundColor: dark.panelSoft,
  },
  discoveryTitleSkeleton: {
    marginTop: 14,
    width: "48%",
    height: 24,
    borderRadius: 8,
    backgroundColor: dark.panelSoft,
  },
  discoveryItemSkeleton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: dark.panelSoft,
  },
});
