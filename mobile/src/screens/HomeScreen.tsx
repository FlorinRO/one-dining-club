import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { MapPin, Search, SearchX, SlidersHorizontal, Star } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { restaurantsApi } from "../api/restaurantsApi";
import { addressesApi } from "../api/addressesApi";
import { RestaurantCard } from "../components/RestaurantCard";
import { Screen } from "../components/Screen";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { HomeStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { useFavoritesStore } from "../store/favoritesStore";
import { colors } from "../theme/colors";
import { Address, Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

type CarouselItem = {
  label: string;
  hint: string;
  iconUrl?: string;
  action?: "favorites";
};

const baseProductCarousel: CarouselItem[] = [
  { label: "Kebab", hint: "Wrap & platou", iconUrl: "https://em-content.zobj.net/source/apple/391/burrito_1f32f.png" },
  { label: "Pizza", hint: "Cuptor pe vatră", iconUrl: "https://em-content.zobj.net/source/apple/391/pizza_1f355.png" },
  { label: "Burgers", hint: "Smash & classic", iconUrl: "https://em-content.zobj.net/source/apple/391/hamburger_1f354.png" },
  { label: "Asian", hint: "Wok & noodles", iconUrl: "https://em-content.zobj.net/source/apple/391/steaming-bowl_1f35c.png" },
  { label: "Sushi", hint: "Nigiri & rolls", iconUrl: "https://em-content.zobj.net/source/apple/391/sushi_1f363.png" },
  { label: "Italian", hint: "Paste & pizza", iconUrl: "https://em-content.zobj.net/source/apple/391/spaghetti_1f35d.png" },
  { label: "Wraps", hint: "Rapid & fresh", iconUrl: "https://em-content.zobj.net/source/apple/391/taco_1f32e.png" },
  { label: "Chicken", hint: "Crispy & grilled", iconUrl: "https://em-content.zobj.net/source/apple/391/poultry-leg_1f357.png" },
  { label: "Sandwich", hint: "Toasted & deli", iconUrl: "https://em-content.zobj.net/source/apple/391/sandwich_1f96a.png" },
  { label: "Japanese", hint: "Ramen-tempura", iconUrl: "https://em-content.zobj.net/source/apple/391/bento-box_1f371.png" },
  { label: "Bakery", hint: "Artisanal", iconUrl: "https://em-content.zobj.net/source/apple/391/croissant_1f950.png" },
  { label: "Healthy", hint: "Fresh & fit", iconUrl: "https://em-content.zobj.net/source/apple/391/green-salad_1f957.png" },
  { label: "Thai", hint: "Spicy Thai", iconUrl: "https://em-content.zobj.net/source/apple/391/hot-pepper_1f336-fe0f.png" },
  { label: "Salads", hint: "Light bowls", iconUrl: "https://em-content.zobj.net/source/apple/391/green-salad_1f957.png" },
  { label: "Ramen", hint: "Slow broth", iconUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f35c.png" },
  { label: "Seafood", hint: "Ocean fresh", iconUrl: "https://em-content.zobj.net/source/apple/391/shrimp_1f990.png" },
  { label: "Desserts", hint: "Sweet bites", iconUrl: "https://em-content.zobj.net/source/apple/391/shortcake_1f370.png" },
  { label: "Indian", hint: "Curry & tandoor", iconUrl: "https://em-content.zobj.net/source/apple/391/curry-rice_1f35b.png" },
  { label: "Breakfast", hint: "All day brunch", iconUrl: "https://em-content.zobj.net/source/apple/391/pancakes_1f95e.png" },
  { label: "Coffee", hint: "Specialty roast", iconUrl: "https://em-content.zobj.net/source/apple/391/hot-beverage_2615.png" },
  { label: "BBQ", hint: "Smoke & grill", iconUrl: "https://em-content.zobj.net/source/apple/391/cut-of-meat_1f969.png" },
  { label: "Soup", hint: "Hot bowls", iconUrl: "https://em-content.zobj.net/source/apple/391/pot-of-food_1f372.png" },
];

const categoryBgPalette = ["#F8EBDD", "#F8F0CF", "#E6F4DD", "#ECE5F8", "#F9E4EA"];
const promotedAds = [
  { id: "ad-1", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80" },
  { id: "ad-2", imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80" },
  { id: "ad-3", imageUrl: "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80" },
  { id: "ad-4", imageUrl: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80" },
];

const sectionShuffle = (id: number, seed: number) => ((id * 37 + seed * 17) % 97) / 97;

export function HomeScreen({ navigation }: Props) {
  const { tr } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [hasLoadedRestaurants, setHasLoadedRestaurants] = useState(false);
  const [hasMetSplashTime, setHasMetSplashTime] = useState(false);
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const favoriteRestaurantIds = useFavoritesStore((state) => state.restaurantIds);
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [searchBarY, setSearchBarY] = useState(0);
  const lastScrollY = useRef(0);
  const stickyAnim = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashSequence = useRef(new Animated.Value(0)).current;
  const tabBarReveal = useRef(new Animated.Value(0)).current;
  const promotedListRef = useRef<FlatList<{ id: string; imageUrl: string }> | null>(null);
  const promotedIndexRef = useRef(0);
  const promotedAutoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const promotedResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();

  const fetchRestaurants = useCallback(async () => {
    const items = await restaurantsApi.list();
    setRestaurants(items);
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchRestaurants()
      .catch(() => {
        // Keep existing content if loading fails.
      })
      .finally(() => {
        if (isMounted) {
          setHasLoadedRestaurants(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchRestaurants]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchRestaurants();
    } finally {
      setRefreshing(false);
    }
  }, [fetchRestaurants]);

  useEffect(() => {
    const timer = setTimeout(() => setHasMetSplashTime(true), 2600);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const revealSequence = Animated.timing(splashSequence, {
      toValue: 1,
      duration: 1750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    revealSequence.start();

    return () => {
      revealSequence.stop();
      splashSequence.setValue(0);
    };
  }, [splashSequence]);

  useEffect(() => {
    if (!hasLoadedRestaurants || !hasMetSplashTime) {
      return;
    }

    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 780,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShowSplashOverlay(false);
      }
    });
  }, [hasLoadedRestaurants, hasMetSplashTime, splashOpacity]);

  useEffect(() => {
    const tabsParent = navigation.getParent();
    const baseTabBarStyle = {
      height: 46 + insets.bottom,
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      paddingTop: 6,
      paddingBottom: 2 + insets.bottom,
    };

    if (!tabsParent) {
      return;
    }

    if (showSplashOverlay) {
      tabBarReveal.stopAnimation();
      tabBarReveal.setValue(0);
      tabsParent.setOptions({
        tabBarStyle: { display: "none" },
      });
      return () => {
        tabsParent.setOptions({
          tabBarStyle: undefined,
        });
      };
    }

    const setAnimatedTabBarStyle = (progress: number) => {
      tabsParent.setOptions({
        tabBarStyle: [
          baseTabBarStyle,
          {
            opacity: progress,
            transform: [{ translateY: (1 - progress) * 22 }],
          },
        ],
      });
    };

    setAnimatedTabBarStyle(0);
    const listenerId = tabBarReveal.addListener(({ value }) => {
      setAnimatedTabBarStyle(value);
    });

    Animated.timing(tabBarReveal, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    return () => {
      tabBarReveal.removeListener(listenerId);
      tabsParent.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [insets.bottom, navigation, showSplashOverlay, tabBarReveal]);

  useEffect(() => {
    Animated.timing(stickyAnim, {
      toValue: showStickySearch ? 1 : 0,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showStickySearch, stickyAnim]);

  const filtered = useMemo(() => {
    return restaurants.filter((restaurant) => {
      const matchesSearch = restaurant.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === "All" || restaurant.categories?.some((category) => category.name === activeCategory);
      return matchesSearch && matchesCategory;
    });
  }, [restaurants, search, activeCategory]);

  const nearbyRestaurants = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const distanceA = Number(a.distance_km ?? 99);
      const distanceB = Number(b.distance_km ?? 99);
      if (distanceA !== distanceB) return distanceA - distanceB;
      return sectionShuffle(a.id, 1) - sectionShuffle(b.id, 1);
    });
  }, [filtered]);

  const recommendedRestaurants = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const scoreA = Number(a.rating) + Number(a.reviews_count ?? 0) * 0.001 + (a.has_offer ? 0.25 : 0);
      const scoreB = Number(b.rating) + Number(b.reviews_count ?? 0) * 0.001 + (b.has_offer ? 0.25 : 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return sectionShuffle(a.id, 2) - sectionShuffle(b.id, 2);
    });
  }, [filtered]);
  const nearbyCarouselRestaurants = useMemo(() => nearbyRestaurants.slice(0, 5), [nearbyRestaurants]);
  const recommendedCarouselRestaurants = useMemo(() => recommendedRestaurants.slice(0, 5), [recommendedRestaurants]);

  const allRestaurants = useMemo(() => {
    return [...filtered].sort((a, b) => sectionShuffle(a.id, 3) - sectionShuffle(b.id, 3));
  }, [filtered]);
  const hasSearchQuery = search.trim().length > 0;
  const showEmptySearchState = hasSearchQuery && filtered.length === 0;
  const promotedCardWidth = Math.max(220, screenWidth - 44);
  const promotedItemGap = 28;
  const promotedItemSize = promotedCardWidth + promotedItemGap;
  const promotedCarouselData = useMemo(
    () =>
      [...promotedAds, ...promotedAds, ...promotedAds].map((item, index) => ({
        ...item,
        id: `${item.id}-${index}`,
      })),
    [],
  );
  const promotedBaseLength = promotedAds.length;

  useEffect(() => {
    const startAutoScroll = () => {
      if (promotedAutoTimerRef.current) {
        clearInterval(promotedAutoTimerRef.current);
      }
      promotedAutoTimerRef.current = setInterval(() => {
        const nextIndex = promotedIndexRef.current + 1;
        promotedListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        promotedIndexRef.current = nextIndex;
      }, 4000);
    };

    const stopAutoScroll = () => {
      if (promotedAutoTimerRef.current) {
        clearInterval(promotedAutoTimerRef.current);
        promotedAutoTimerRef.current = null;
      }
    };

    const resumeAutoScroll = (delayMs: number) => {
      if (promotedResumeTimerRef.current) {
        clearTimeout(promotedResumeTimerRef.current);
      }
      promotedResumeTimerRef.current = setTimeout(() => {
        startAutoScroll();
      }, delayMs);
    };

    const pauseAutoScroll = () => {
      stopAutoScroll();
      resumeAutoScroll(2500);
    };

    const initialTimer = setTimeout(() => {
      promotedIndexRef.current = promotedBaseLength;
      promotedListRef.current?.scrollToIndex({ index: promotedBaseLength, animated: false });
      startAutoScroll();
    }, 500);

    return () => {
      clearTimeout(initialTimer);
      stopAutoScroll();
      if (promotedResumeTimerRef.current) {
        clearTimeout(promotedResumeTimerRef.current);
      }
    };
  }, [promotedBaseLength]);

  const carouselItems = useMemo(() => {
    if (favoriteRestaurantIds.length === 0) {
      return baseProductCarousel;
    }

    return [{ label: "Favourites", hint: tr("Locuri salvate", "Saved places"), action: "favorites" as const }, ...baseProductCarousel];
  }, [favoriteRestaurantIds.length, tr]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    trackFloatingCartScrollDirection(event);
    const currentY = Math.max(0, event.nativeEvent.contentOffset.y);
    const delta = currentY - lastScrollY.current;
    const topHideThreshold = searchBarY + 10;
    const showThreshold = searchBarY + 30;

    if (currentY <= topHideThreshold) {
      if (showStickySearch) setShowStickySearch(false);
      lastScrollY.current = currentY;
      return;
    }

    if (delta <= -1.5 && currentY > showThreshold) {
      if (!showStickySearch) setShowStickySearch(true);
    } else if (delta >= 1.5) {
      if (showStickySearch) setShowStickySearch(false);
    }

    lastScrollY.current = currentY;
  };

  const openSearchWithFocus = () => {
    navigation.getParent()?.navigate("SearchTab", { focusSearch: true });
  };

  const loadDefaultAddress = useCallback(async () => {
    if (!accessToken) {
      setDefaultAddress(null);
      return;
    }
    try {
      const list = await addressesApi.list();
      const selected = list.find((item) => item.is_default) ?? list[0] ?? null;
      setDefaultAddress(selected);
    } catch {
      setDefaultAddress(null);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      loadDefaultAddress();
    }, [loadDefaultAddress]),
  );

  return (
    <Screen padded={false}>
      <Animated.View
        pointerEvents={showStickySearch ? "auto" : "none"}
        style={[
          styles.searchStickyOverlay,
          {
            opacity: stickyAnim,
            transform: [
              {
                translateY: stickyAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable style={styles.searchBar} onPress={openSearchWithFocus}>
          <Search size={23} stroke={colors.text} strokeWidth={2.6} />
          <View style={styles.searchInputProxy} pointerEvents="none">
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={tr("Caută restaurante sau preparate", "Search restaurants or dishes")}
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              editable={false}
              showSoftInputOnFocus={false}
            />
          </View>
          <Pressable hitSlop={8} onPress={() => navigation.getParent()?.navigate("SearchTab", { openFilters: true })}>
            <SlidersHorizontal size={22} stroke={colors.text} strokeWidth={2.7} />
          </Pressable>
        </Pressable>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.red} />}
      >
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <View style={styles.eyebrowBadge}>
              <View style={styles.eyebrowRow}>
                <Text style={styles.eyebrow}>ONE DINING CLUB</Text>
                <Star color={colors.white} fill={colors.white} size={11} strokeWidth={2} />
              </View>
            </View>
            <Pressable style={styles.locationRow} onPress={() => navigation.navigate("DeliveryAddress")}>
              <MapPin size={16} stroke={colors.red} />
              <View style={styles.locationTextBlock}>
                <Text style={styles.locationStreet}>
                  {defaultAddress?.address_line_1 ?? tr("Adaugă o adresă de livrare", "Add a delivery address")}
                </Text>
                <Text style={styles.locationCity}>
                  {defaultAddress?.city ?? tr("Apasă ca să selectezi adresa", "Tap to select address")}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View
          style={styles.searchStickyWrap}
          onLayout={(event) => {
            setSearchBarY(event.nativeEvent.layout.y);
          }}
        >
          <Pressable style={styles.searchBar} onPress={openSearchWithFocus}>
            <Search size={23} stroke={colors.text} strokeWidth={2.6} />
            <View style={styles.searchInputProxy} pointerEvents="none">
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={tr("Caută restaurante sau preparate", "Search restaurants or dishes")}
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                editable={false}
                showSoftInputOnFocus={false}
              />
            </View>
            <Pressable hitSlop={8} onPress={() => navigation.getParent()?.navigate("SearchTab", { openFilters: true })}>
              <SlidersHorizontal size={22} stroke={colors.text} strokeWidth={2.7} />
            </Pressable>
          </Pressable>
        </View>

        <FlatList
          horizontal
          data={carouselItems}
          keyExtractor={(item) => item.label}
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.categoryTile}
              onPress={() => {
                if (item.action === "favorites") {
                  navigation.navigate("Favorites");
                  return;
                }

                navigation.getParent()?.navigate("SearchTab", { category: item.label });
              }}
            >
              <View style={[styles.categoryIconCard, { backgroundColor: categoryBgPalette[index % categoryBgPalette.length] }]}>
                {item.iconUrl ? (
                  <Image source={{ uri: item.iconUrl }} style={styles.categoryImage} resizeMode="contain" />
                ) : (
                  <View style={styles.categoryImageFallback}>
                    <Text style={[styles.categoryImageFallbackText, item.action === "favorites" && styles.favoriteFallbackIcon]}>
                      {item.action === "favorites" ? "❤️" : "★"}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.categoryLabel}>{item.label}</Text>
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 4 }} />}
          style={styles.fullBleedList}
          contentContainerStyle={styles.chips}
        />

        {showEmptySearchState ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <SearchX size={24} stroke={colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>{tr("Niciun rezultat", "No results")}</Text>
            <Text style={styles.emptyText}>{tr(`Nu există rezultate pentru „${search.trim()}”.`, `No results for "${search.trim()}".`)}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.sectionBlock, styles.firstSectionBlock, styles.promotedCarouselBlock]}>
              <View style={styles.promotedViewport}>
                <FlatList
                  ref={promotedListRef}
                  horizontal
                  data={promotedCarouselData}
                  keyExtractor={(item) => item.id}
                  initialScrollIndex={promotedBaseLength}
                  renderItem={({ item }) => (
                    <View style={[styles.promotedBanner, { width: promotedCardWidth }]}>
                      <Image source={{ uri: item.imageUrl }} style={styles.promotedBannerImage} resizeMode="cover" />
                      <View style={styles.promotedOverlay}>
                        <Text style={styles.promotedBadge}>{tr("SLOT DISPONIBIL", "AVAILABLE SLOT")}</Text>
                        <Text style={styles.promotedTitle}>{tr("Loc de reclamă", "Ad placement")}</Text>
                      </View>
                    </View>
                  )}
                  showsHorizontalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={{ width: promotedItemGap }} />}
                  contentContainerStyle={styles.promotedCarouselContent}
                  snapToInterval={promotedItemSize}
                  decelerationRate="fast"
                  disableIntervalMomentum
                  onScrollBeginDrag={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / promotedItemSize);
                    promotedIndexRef.current = Number.isFinite(index) ? Math.max(0, Math.min(promotedCarouselData.length - 1, index)) : promotedBaseLength;
                    if (promotedAutoTimerRef.current) {
                      clearInterval(promotedAutoTimerRef.current);
                      promotedAutoTimerRef.current = null;
                    }
                    if (promotedResumeTimerRef.current) {
                      clearTimeout(promotedResumeTimerRef.current);
                    }
                  }}
                  onMomentumScrollBegin={() => {
                    if (promotedAutoTimerRef.current) {
                      clearInterval(promotedAutoTimerRef.current);
                      promotedAutoTimerRef.current = null;
                    }
                  }}
                  onScrollEndDrag={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / promotedItemSize);
                    promotedIndexRef.current = Number.isFinite(index) ? Math.max(0, Math.min(promotedCarouselData.length - 1, index)) : promotedBaseLength;
                    if (promotedResumeTimerRef.current) {
                      clearTimeout(promotedResumeTimerRef.current);
                    }
                    promotedResumeTimerRef.current = setTimeout(() => {
                      if (promotedAutoTimerRef.current) {
                        clearInterval(promotedAutoTimerRef.current);
                      }
                      promotedAutoTimerRef.current = setInterval(() => {
                        const nextIndex = promotedIndexRef.current + 1;
                        promotedListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                        promotedIndexRef.current = nextIndex;
                      }, 4000);
                    }, 2500);
                  }}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / promotedItemSize);
                    let normalizedIndex = Number.isFinite(index) ? Math.max(0, Math.min(promotedCarouselData.length - 1, index)) : promotedBaseLength;

                    if (normalizedIndex < promotedBaseLength) {
                      normalizedIndex += promotedBaseLength;
                      promotedListRef.current?.scrollToIndex({ index: normalizedIndex, animated: false });
                    } else if (normalizedIndex >= promotedBaseLength * 2) {
                      normalizedIndex -= promotedBaseLength;
                      promotedListRef.current?.scrollToIndex({ index: normalizedIndex, animated: false });
                    }

                    promotedIndexRef.current = normalizedIndex;
                  }}
                  getItemLayout={(_, index) => ({ length: promotedItemSize, offset: promotedItemSize * index, index })}
                  onScrollToIndexFailed={() => {
                    promotedListRef.current?.scrollToOffset({
                      offset: promotedItemSize * promotedIndexRef.current,
                      animated: false,
                    });
                  }}
                />
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader
                title={tr("Aproape de tine", "Near you")}
                actionLabel={tr("Toate >", "All >")}
                onPressAction={() => navigation.navigate("SectionRestaurants", { mode: "nearby", title: tr("Aproape de tine", "Near you") })}
              />
              <FlatList
                horizontal
                data={nearbyCarouselRestaurants}
                keyExtractor={(item) => `nearby-${item.id}`}
                renderItem={({ item }) => (
                  <RestaurantCard medium smallImageOnly restaurant={item} onPress={() => navigation.navigate("RestaurantDetails", { restaurant: item })} />
                )}
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
                style={styles.fullBleedList}
                contentContainerStyle={styles.horizontalCardsContent}
              />
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader
                title={tr("Recomandate", "Recommended")}
                actionLabel={tr("Toate >", "All >")}
                onPressAction={() => navigation.navigate("SectionRestaurants", { mode: "recommended", title: tr("Recomandate", "Recommended") })}
              />
              <FlatList
                horizontal
                data={recommendedCarouselRestaurants}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <RestaurantCard medium smallImageOnly restaurant={item} onPress={() => navigation.navigate("RestaurantDetails", { restaurant: item })} />
                )}
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
                style={styles.fullBleedList}
                contentContainerStyle={styles.horizontalCardsContent}
              />
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader title={tr("Toate restaurantele", "All restaurants")} />
              <View style={styles.allRestaurantsList}>
                {allRestaurants.map((restaurant) => (
                  <RestaurantCard
                    key={`all-${restaurant.id}`}
                    compact
                    restaurant={restaurant}
                    onPress={() => navigation.navigate("RestaurantDetails", { restaurant })}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {showSplashOverlay ? (
        <HomeLoadingOverlay opacity={splashOpacity} progress={splashSequence} />
      ) : null}
    </Screen>
  );
}

function HomeLoadingOverlay({
  opacity,
  progress,
}: {
  opacity: Animated.Value;
  progress: Animated.Value;
}) {
  const textTranslateX = progress.interpolate({
    inputRange: [0, 0.18, 0.38, 1],
    outputRange: [22, 22, 0, 0],
  });
  const textOpacity = progress.interpolate({
    inputRange: [0, 0.2, 0.35, 1],
    outputRange: [0, 0, 1, 1],
  });
  const starOpacity = progress.interpolate({
    inputRange: [0, 0.52, 0.74, 1],
    outputRange: [0, 0, 1, 1],
  });
  const starScale = progress.interpolate({
    inputRange: [0, 0.52, 0.72, 0.84, 1],
    outputRange: [0.45, 0.45, 1.22, 0.96, 1],
  });
  const starRotate = progress.interpolate({
    inputRange: [0, 0.52, 0.7, 0.84, 1],
    outputRange: ["-45deg", "-45deg", "18deg", "-8deg", "0deg"],
  });
  const starTranslateY = progress.interpolate({
    inputRange: [0, 0.52, 0.72, 0.84, 1],
    outputRange: [28, 28, -5, 0, 0],
  });
  const starTranslateX = progress.interpolate({
    inputRange: [0, 0.52, 0.72, 0.9, 1],
    outputRange: [-10, -10, 2, 0, 0],
  });
  const starBurstOpacity = progress.interpolate({
    inputRange: [0, 0.7, 0.82, 1],
    outputRange: [0, 0, 1, 0],
  });
  const sparkTravelWaveOne = progress.interpolate({
    inputRange: [0, 0.68, 0.9, 1],
    outputRange: [0, 0, 1, 1],
  });
  const sparkTravelWaveTwo = progress.interpolate({
    inputRange: [0, 0.8, 0.98, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={() => undefined}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible
    >
      <Animated.View pointerEvents="auto" style={[styles.loadingOverlay, { opacity }]}>
        <View style={styles.loadingStage}>
          <Animated.View style={[styles.loaderTitleRow, { opacity: textOpacity, transform: [{ translateX: textTranslateX }] }]}>
            <Text style={styles.loaderTitle}>ONE DINING CLUB</Text>
            <Animated.View
              style={[
                styles.loaderStarWrap,
                {
                  opacity: starOpacity,
                  transform: [{ translateX: starTranslateX }, { translateY: starTranslateY }, { scale: starScale }, { rotate: starRotate }],
                },
              ]}
            >
              <Spark travel={sparkTravelWaveOne} opacity={starBurstOpacity} dx={0} dy={-26} delay={0.02} size={4} />
              <Spark travel={sparkTravelWaveOne} opacity={starBurstOpacity} dx={20} dy={-16} delay={0.06} size={3} />
              <Spark travel={sparkTravelWaveOne} opacity={starBurstOpacity} dx={24} dy={2} delay={0.09} size={4} />
              <Spark travel={sparkTravelWaveOne} opacity={starBurstOpacity} dx={14} dy={20} delay={0.08} size={3} />
              <Spark travel={sparkTravelWaveOne} opacity={starBurstOpacity} dx={-17} dy={18} delay={0.05} size={4} />
              <Spark travel={sparkTravelWaveOne} opacity={starBurstOpacity} dx={-24} dy={-6} delay={0.04} size={3} />
              <Spark travel={sparkTravelWaveTwo} opacity={starBurstOpacity} dx={0} dy={-34} delay={0.01} size={2} />
              <Spark travel={sparkTravelWaveTwo} opacity={starBurstOpacity} dx={28} dy={-20} delay={0.03} size={2} />
              <Spark travel={sparkTravelWaveTwo} opacity={starBurstOpacity} dx={33} dy={1} delay={0.05} size={2} />
              <Spark travel={sparkTravelWaveTwo} opacity={starBurstOpacity} dx={20} dy={27} delay={0.04} size={2} />
              <Spark travel={sparkTravelWaveTwo} opacity={starBurstOpacity} dx={-22} dy={25} delay={0.02} size={2} />
              <Spark travel={sparkTravelWaveTwo} opacity={starBurstOpacity} dx={-31} dy={-9} delay={0.03} size={2} />
              <Star size={20} color={colors.white} fill={colors.white} strokeWidth={2} />
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

function Spark({
  travel,
  opacity,
  dx,
  dy,
  delay = 0,
  size = 4,
}: {
  travel: Animated.AnimatedInterpolation<number>;
  opacity: Animated.AnimatedInterpolation<number>;
  dx: number;
  dy: number;
  delay?: number;
  size?: number;
}) {
  const delayedTravel = travel.interpolate({
    inputRange: [0, Math.min(1, 0.12 + delay), 1],
    outputRange: [0, 0, 1],
  });
  const sparkTranslateX = delayedTravel.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dx],
  });
  const sparkTranslateY = delayedTravel.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dy],
  });
  const sparkScale = delayedTravel.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0.2, 1, 0.5],
  });

  return (
    <Animated.View
      style={[
        styles.spark,
        { width: size, height: size },
        {
          opacity,
          transform: [{ translateX: sparkTranslateX }, { translateY: sparkTranslateY }, { scale: sparkScale }],
        },
      ]}
    />
  );
}

function SectionHeader({ title, actionLabel, onPressAction }: { title: string; actionLabel?: string; onPressAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onPressAction ? (
        <Pressable onPress={onPressAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTextBlock: {
    gap: 7,
    width: "100%",
  },
  eyebrowBadge: {
    alignSelf: "stretch",
    backgroundColor: colors.red,
    marginHorizontal: -22,
    paddingHorizontal: 22,
    paddingVertical: 6,
    borderRadius: 0,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eyebrow: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 4,
  },
  locationTextBlock: {
    gap: 2,
  },
  locationStreet: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  locationCity: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  searchBar: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.cardSoft,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchStickyWrap: {
    backgroundColor: colors.background,
    paddingVertical: 6,
  },
  searchStickyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
  },
  searchInputProxy: {
    flex: 1,
  },
  chips: {
    paddingVertical: 0,
    paddingHorizontal: 22,
  },
  fullBleedList: {
    marginHorizontal: -22,
  },
  horizontalCardsContent: {
    paddingHorizontal: 22,
  },
  categoryTile: {
    width: 84,
    alignItems: "center",
    gap: 6,
  },
  categoryIconCard: {
    width: 84,
    height: 74,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryImage: {
    width: 48,
    height: 48,
  },
  categoryImageFallback: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryImageFallbackText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "800",
  },
  favoriteFallbackIcon: {
    fontSize: 30,
    lineHeight: 34,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  categoryLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionAction: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 30,
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
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  allRestaurantsList: {
    gap: 30,
  },
  sectionBlock: {
    gap: 14,
    marginTop: 24,
  },
  firstSectionBlock: {
    marginTop: 0,
  },
  promotedCarouselBlock: {
    marginTop: 8,
  },
  promotedCarouselContent: {
    paddingHorizontal: 22,
  },
  promotedViewport: {
    overflow: "visible",
    marginHorizontal: -22,
  },
  promotedBanner: {
    height: 134,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#B8162A",
  },
  promotedBannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  promotedOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  promotedBadge: {
    alignSelf: "flex-start",
    color: "#1A1A1A",
    fontSize: 11,
    fontWeight: "800",
    backgroundColor: "#F9EDC3",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  promotedTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  promotedSubtitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "500",
  },
  loadingOverlay: {
    flex: 1,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red,
  },
  loadingStage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  loaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loaderTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 1.8,
  },
  loaderStarWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  spark: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
});
