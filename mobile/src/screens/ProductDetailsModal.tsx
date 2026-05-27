import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { ArrowLeft, Check, Clock3, Flame, Heart, MessageSquareText, Share2, ShoppingBag, Truck } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { QuantityStepper } from "../components/QuantityStepper";
import { getDemoProductVideoSource } from "../data/demoVideos";
import { useI18n } from "../i18n/useI18n";
import { money } from "../lib/format";
import { resolveRestaurantImageUri } from "../lib/images";
import { HomeStackParamList } from "../navigation/types";
import { useCartStore } from "../store/cartStore";
import { colors } from "../theme/colors";
import { Product, ProductOption, ProductOptionGroup, Restaurant } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "ProductDetails">;

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
  green: "#2ED573",
};

const INGREDIENT_GRAM_STEP = 10;

const selectedCountForGroup = (selectedOptions: ProductOption[], group: ProductOptionGroup) => {
  const optionIds = new Set(group.options.map((option) => option.id));
  return selectedOptions.filter((option) => optionIds.has(option.id)).length;
};

const minimumRequiredForGroup = (group: ProductOptionGroup) =>
  Math.max(group.min_select, group.is_required ? 1 : 0);

const groupHint = (group: ProductOptionGroup, tr: (ro: string, en: string) => string) => {
  const minimumRequired = minimumRequiredForGroup(group);
  const maxSelect = Math.max(group.max_select || 1, 1);
  if (minimumRequired > 0 && maxSelect > minimumRequired) {
    return tr(`Necesar · alege ${minimumRequired}-${maxSelect}`, `Required · choose ${minimumRequired}-${maxSelect}`);
  }
  if (minimumRequired > 0) {
    return tr(`Necesar · alege ${minimumRequired}`, `Required · choose ${minimumRequired}`);
  }
  return maxSelect > 1 ? tr(`Opțional · maxim ${maxSelect}`, `Optional · up to ${maxSelect}`) : tr("Opțional", "Optional");
};

const videoSourceForProduct = (restaurant: Restaurant, product: Product, mediaFallbackIndex?: number): VideoSource => {
  if (product.video_url) {
    return {
      uri: product.video_url,
      contentType: "progressive",
      useCaching: false,
    };
  }

  if (mediaFallbackIndex != null) {
    return getDemoProductVideoSource(mediaFallbackIndex);
  }

  return getDemoProductVideoSource({ restaurant, product, fallbackIndex: product.id });
};

const parseCaloriesValue = (value?: number | string) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    if (!/\d/.test(value)) {
      return null;
    }
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const capitalizeIngredient = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
};

export function ProductDetailsModal({ navigation, route }: Props) {
  const { tr } = useI18n();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { product, restaurant, mediaFallbackIndex } = route.params;
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<ProductOption[]>([]);
  const [ingredientGramOverrides, setIngredientGramOverrides] = useState<Record<string, number>>({});
  const optionGroups = product.option_groups ?? [];
  const basePrice = product.effective_price ?? product.discount_price ?? product.price;
  const heroHeight = Math.max(470, Math.round(height * 0.67));
  const restaurantLogoUri = resolveRestaurantImageUri(restaurant.logo || restaurant.cover_image, restaurant.id, restaurant);
  const videoSource = useMemo(
    () => videoSourceForProduct(restaurant, product, mediaFallbackIndex),
    [mediaFallbackIndex, product, restaurant],
  );
  const productNutrition = product as unknown as {
    ingredients?: string | string[];
    calories?: number | string;
  };
  const ingredientList = useMemo(() => {
    if (Array.isArray(productNutrition.ingredients)) {
      return productNutrition.ingredients
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8);
    }
    if (typeof productNutrition.ingredients === "string") {
      return productNutrition.ingredients
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8);
    }
    return [];
  }, [productNutrition.ingredients]);
  const ingredientRows = useMemo(() => {
    const totalCalories = parseCaloriesValue(productNutrition.calories);
    const ingredientCount = ingredientList.length;
    const rankTotal = (ingredientCount * (ingredientCount + 1)) / 2;
    const estimatedTotalGrams = Math.max(240, ingredientCount * 70);

    return ingredientList.map((name, index) => ({
      id: `${index}-${name.toLowerCase()}`,
      name: capitalizeIngredient(name),
      baseCalories:
        totalCalories && ingredientCount > 0
          ? Math.max(5, Math.round((totalCalories * (ingredientCount - index)) / rankTotal))
          : null,
      baseGrams: Math.max(10, Math.round((estimatedTotalGrams * (ingredientCount - index)) / rankTotal)),
    }));
  }, [ingredientList, productNutrition.calories]);
  const adjustedIngredientRows = useMemo(
    () =>
      ingredientRows.map((ingredient) => {
        const grams = ingredientGramOverrides[ingredient.id] ?? ingredient.baseGrams;
        return {
          ...ingredient,
          grams,
          calories:
            ingredient.baseCalories != null
              ? Math.round((ingredient.baseCalories * grams) / ingredient.baseGrams)
              : null,
        };
      }),
    [ingredientGramOverrides, ingredientRows],
  );
  const adjustedTotalGrams = useMemo(
    () => adjustedIngredientRows.reduce((sum, ingredient) => sum + ingredient.grams, 0),
    [adjustedIngredientRows],
  );
  const adjustedCaloriesText = useMemo(() => {
    const totalCalories = parseCaloriesValue(productNutrition.calories);
    if (totalCalories == null) {
      return tr("Nedisponibil", "Unavailable");
    }
    const calories = adjustedIngredientRows.reduce((sum, ingredient) => sum + (ingredient.calories ?? 0), 0);
    return `${Math.max(0, Math.round(calories))} kcal`;
  }, [adjustedIngredientRows, productNutrition.calories, tr]);
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
      // Keep the details screen usable if native video playback cannot start.
    }

    return () => {
      try {
        player.pause();
      } catch {
        // Ignore cleanup failures from native video state.
      }
    };
  }, [player]);

  const total = useMemo(() => {
    const base = Number(basePrice);
    const extras = selectedOptions.reduce((sum, option) => sum + Number(option.extra_price), 0);
    return (base + extras) * quantity;
  }, [basePrice, quantity, selectedOptions]);

  const missingRequiredGroup = useMemo(
    () =>
      optionGroups.find((group) => {
        const minimumRequired = minimumRequiredForGroup(group);
        return minimumRequired > 0 && selectedCountForGroup(selectedOptions, group) < minimumRequired;
      }),
    [optionGroups, selectedOptions],
  );

  const isAvailable = product.is_available !== false;
  const canSubmit = isAvailable && !missingRequiredGroup;

  const toggleOption = (option: ProductOption, group: ProductOptionGroup) => {
    if (!option.is_available) return;

    setSelectedOptions((current) => {
      const optionIds = new Set(group.options.map((item) => item.id));
      const exists = current.some((item) => item.id === option.id);
      if (exists) {
        return current.filter((item) => item.id !== option.id);
      }

      const selectedInGroup = current.filter((item) => optionIds.has(item.id));
      const selectedOutsideGroup = current.filter((item) => !optionIds.has(item.id));
      const maxSelect = Math.max(group.max_select || 1, 1);

      if (maxSelect === 1) {
        return [...selectedOutsideGroup, option];
      }
      if (selectedInGroup.length >= maxSelect) {
        return current;
      }
      return [...current, option];
    });
  };

  const shareProduct = async () => {
    await Share.share({
      title: product.name,
      message: `${product.name} · ${restaurant.name}\n${product.description}`,
    });
  };

  const onFavoritePress = () => {
    Alert.alert(tr("Favorite", "Favorite"), tr("Funcția de favorite vine în curând.", "Favorite feature is coming soon."));
  };

  const onCommentPress = () => {
    Alert.alert(tr("Comentarii", "Comments"), tr("Secțiunea de comentarii vine în curând.", "Comments section is coming soon."));
  };

  const adjustIngredientGrams = (ingredientId: string, direction: -1 | 1) => {
    const ingredient = adjustedIngredientRows.find((item) => item.id === ingredientId);
    if (!ingredient) return;

    setIngredientGramOverrides((current) => {
      const currentGrams = current[ingredientId] ?? ingredient.baseGrams;
      const maxGrams = ingredient.baseGrams * 2;
      const nextGrams = Math.min(maxGrams, Math.max(0, currentGrams + direction * INGREDIENT_GRAM_STEP));

      if (nextGrams === ingredient.baseGrams) {
        const { [ingredientId]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [ingredientId]: nextGrams };
    });
  };

  const submit = () => {
    if (!canSubmit) return;
    const adjustedIngredients = adjustedIngredientRows.filter((ingredient) => ingredient.grams !== ingredient.baseGrams);
    const adjustedIngredientsNote = adjustedIngredients.length
      ? tr(
          `Ingrediente ajustate: ${adjustedIngredients.map((ingredient) => `${ingredient.name} ${ingredient.grams}g`).join(", ")}`,
          `Adjusted ingredients: ${adjustedIngredients.map((ingredient) => `${ingredient.name} ${ingredient.grams}g`).join(", ")}`,
        )
      : undefined;
    addItem({ product, restaurant, quantity, selectedOptions, notes: adjustedIngredientsNote });
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 146 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture={false}
            playsInline
            surfaceType="textureView"
            useExoShutter={false}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.18)", "rgba(0,0,0,0.08)", "rgba(0,0,0,0.92)"]}
            locations={[0, 0.44, 1]}
            style={styles.heroGradient}
          />
          <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}> 
            <Pressable onPress={() => navigation.goBack()} style={styles.roundIconButton}>
              <ArrowLeft size={22} stroke={dark.text} />
            </Pressable>
            <View style={styles.topActions}>
              <Pressable onPress={shareProduct} style={styles.roundIconButton}>
                <Share2 size={20} stroke={dark.text} />
              </Pressable>
              <Pressable onPress={onFavoritePress} style={styles.roundIconButton}>
                <Heart size={20} stroke={dark.text} />
              </Pressable>
              <Pressable onPress={onCommentPress} style={styles.roundIconButton}>
                <MessageSquareText size={20} stroke={dark.text} />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.creatorRow}>
              <Image source={{ uri: restaurantLogoUri }} style={styles.creatorAvatar} />
              <View style={styles.creatorText}>
                <Text numberOfLines={1} style={styles.creatorName}>{restaurant.name}</Text>
                <Text numberOfLines={1} style={styles.creatorMeta}>
                  {product.category_name || tr("Recomandarea bucătarului", "Chef pick")}
                </Text>
              </View>
            </View>
            <Text style={styles.productName}>{product.name}</Text>
            <Text numberOfLines={3} style={styles.description}>{product.description}</Text>
            <View style={styles.metaPanel}>
              <View style={styles.metaStatRow}>
                <View style={styles.metaStatPill}>
                  <View style={styles.metaStatIconWrap}>
                    <Flame size={15} stroke={dark.text} strokeWidth={2.4} />
                  </View>
                  <View style={styles.metaStatTextWrap}>
                    <Text numberOfLines={1} style={styles.metaStatLabel}>{tr("Calorii", "Calories")}</Text>
                    <Text numberOfLines={1} style={styles.metaStatValue}>{adjustedCaloriesText}</Text>
                  </View>
                </View>
                <View style={styles.metaStatPill}>
                  <View style={styles.metaStatIconWrap}>
                    <Clock3 size={15} stroke={dark.text} strokeWidth={2.4} />
                  </View>
                  <View style={styles.metaStatTextWrap}>
                    <Text numberOfLines={1} style={styles.metaStatLabel}>{tr("Preparare", "Prep")}</Text>
                    <Text numberOfLines={1} style={styles.metaStatValue}>{product.preparation_time} {tr("min", "min")}</Text>
                  </View>
                </View>
                <View style={styles.metaStatPill}>
                  <View style={styles.metaStatIconWrap}>
                    <Truck size={15} stroke={dark.text} strokeWidth={2.4} />
                  </View>
                  <View style={styles.metaStatTextWrap}>
                    <Text numberOfLines={1} style={styles.metaStatLabel}>{tr("Livrare", "Delivery")}</Text>
                    <Text numberOfLines={1} style={styles.metaStatValue}>
                      {restaurant.estimated_delivery_time_min}-{restaurant.estimated_delivery_time_max} {tr("min", "min")}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.nutritionSection}>
          <View style={styles.ingredientLabel}>
            <View style={styles.ingredientLabelHeader}>
              <View>
                <Text style={styles.ingredientLabelEyebrow}>{tr("Etichetă produs", "Product label")}</Text>
                <View style={styles.ingredientTitleRow}>
                  <Text style={styles.ingredientLabelTitle}>{tr("Ingrediente", "Ingredients")}</Text>
                  <Text style={styles.ingredientTotalGrams}>{adjustedTotalGrams}g</Text>
                </View>
              </View>
              <View style={styles.ingredientTotalBadge}>
                <Text style={styles.ingredientTotalLabel}>{tr("Total", "Total")}</Text>
                <Text style={styles.ingredientTotalValue}>{adjustedCaloriesText}</Text>
              </View>
            </View>

            {ingredientRows.length > 0 ? (
              <View style={styles.ingredientRows}>
                {adjustedIngredientRows.map((ingredient, index) => (
                  <View key={`${ingredient.name}-${index}`} style={styles.ingredientRow}>
                    <View style={styles.ingredientNameWrap}>
                      <Text style={styles.ingredientIndex}>{String(index + 1).padStart(2, "0")}</Text>
                      <Text numberOfLines={1} style={[styles.ingredientName, ingredient.grams === 0 && styles.ingredientNameMuted]}>
                        {ingredient.name}
                      </Text>
                    </View>
                    <Text style={styles.ingredientGrams}>{ingredient.grams}g</Text>
                    <Text style={styles.ingredientCalories}>
                      {ingredient.calories != null ? `~${ingredient.calories} kcal` : tr("kcal n/a", "kcal n/a")}
                    </Text>
                    <View style={styles.ingredientAdjustControls}>
                      <Pressable
                        disabled={ingredient.grams === 0}
                        onPress={() => adjustIngredientGrams(ingredient.id, -1)}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.ingredientAdjustButton,
                          styles.ingredientMinusButton,
                          ingredient.grams === 0 && styles.ingredientAdjustButtonDisabled,
                          pressed && ingredient.grams > 0 && styles.ingredientAdjustButtonPressed,
                        ]}
                      >
                        <Text style={[styles.ingredientAdjustText, styles.ingredientMinusText]}>-</Text>
                      </Pressable>
                      <Pressable
                        disabled={ingredient.grams >= ingredient.baseGrams * 2}
                        onPress={() => adjustIngredientGrams(ingredient.id, 1)}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.ingredientAdjustButton,
                          styles.ingredientPlusButton,
                          ingredient.grams >= ingredient.baseGrams * 2 && styles.ingredientAdjustButtonDisabled,
                          pressed && ingredient.grams < ingredient.baseGrams * 2 && styles.ingredientAdjustButtonPressed,
                        ]}
                      >
                        <Text style={[styles.ingredientAdjustText, styles.ingredientPlusText]}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
                {parseCaloriesValue(productNutrition.calories) != null ? (
                  <Text style={styles.ingredientEstimateNote}>
                    {tr(
                      "* Unele ingrediente nu pot fi eliminate complet, iar ingredientele extra pot crește prețul final.",
                      "* Some ingredients cannot be fully removed, and extra ingredients may increase the final price.",
                    )}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.ingredientMuted}>
                {tr("Ingredientele vor fi afișate în curând.", "Ingredients will be listed soon.")}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.details}>
          {optionGroups.map((group) => (
            <View key={group.id} style={styles.optionGroup}>
              <View style={styles.sectionHeading}>
                <Text style={styles.groupTitle}>{group.name}</Text>
                <Text style={styles.groupHint}>{groupHint(group, tr)}</Text>
              </View>
              {group.options.map((option) => {
                const active = selectedOptions.some((item) => item.id === option.id);
                const unavailable = !option.is_available;
                const optionPrice = Number(option.extra_price);
                return (
                  <Pressable
                    key={option.id}
                    disabled={unavailable}
                    onPress={() => toggleOption(option, group)}
                    style={({ pressed }) => [
                      styles.option,
                      active && styles.optionActive,
                      pressed && !unavailable && styles.optionPressed,
                      unavailable && styles.optionDisabled,
                    ]}
                  >
                    <View style={[styles.optionCheck, active && styles.optionCheckActive]}>
                      {active ? <Check size={14} stroke={dark.background} strokeWidth={3} /> : null}
                    </View>
                    <Text numberOfLines={2} style={[styles.optionName, active && styles.optionNameActive]}>
                      {option.name}
                    </Text>
                    <Text style={[styles.optionPrice, active && styles.optionNameActive]}>
                      {optionPrice > 0 ? `+${money(option.extra_price)}` : tr("Inclus", "Included")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        {missingRequiredGroup ? (
          <Text style={styles.footerHint}>{tr("Alege", "Choose")} {missingRequiredGroup.name}</Text>
        ) : null}
        <View style={styles.footerRow}>
          <QuantityStepper
            value={quantity}
            onIncrease={() => setQuantity((value) => value + 1)}
            onDecrease={() => setQuantity((value) => Math.max(1, value - 1))}
          />
          <Pressable
            disabled={!canSubmit}
            onPress={submit}
            style={({ pressed }) => [styles.addButton, pressed && canSubmit && styles.addButtonPressed, !canSubmit && styles.addButtonDisabled]}
          >
            {isAvailable ? (
              <>
                <View style={styles.addButtonMainContent}>
                  <ShoppingBag size={18} stroke="#111111" />
                  <Text numberOfLines={1} style={styles.addButtonText}>
                    + {tr("Adaugă", "Add")}
                  </Text>
                </View>
                <View style={styles.addButtonPriceBadge}>
                  <View style={styles.addButtonPriceWrap}>
                    <Text style={styles.addButtonPrice}>{money(total).replace(",", ".")}</Text>
                    <View pointerEvents="none" style={styles.addPriceLineGreenStrike} />
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.addButtonText}>{tr("Indisponibil", "Unavailable")}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark.background,
  },
  content: {
    backgroundColor: dark.background,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: dark.background,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roundIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroCopy: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 68,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  creatorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: dark.panel,
  },
  creatorText: {
    flex: 1,
  },
  creatorName: {
    color: dark.text,
    fontSize: 14,
    fontWeight: "700",
  },
  creatorMeta: {
    marginTop: 2,
    color: dark.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  productName: {
    color: dark.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "500",
  },
  description: {
    marginTop: 9,
    color: dark.muted,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },
  metaPanel: {
    marginTop: 16,
    gap: 10,
  },
  metaStatRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  metaStatPill: {
    minWidth: 108,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.34)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "flex-start",
    gap: 7,
  },
  metaStatIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  metaStatTextWrap: {
    width: "100%",
    minWidth: 0,
    gap: 2,
  },
  metaStatLabel: {
    color: dark.faint,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaStatValue: {
    color: dark.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "500",
  },
  nutritionSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: dark.background,
  },
  ingredientLabel: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(245,241,229,0.95)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ingredientLabelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#161616",
    paddingBottom: 10,
  },
  ingredientLabelEyebrow: {
    color: "rgba(17,17,17,0.58)",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  ingredientLabelTitle: {
    color: "#111111",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  ingredientTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  ingredientTotalGrams: {
    color: "rgba(17,17,17,0.58)",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
  },
  ingredientTotalBadge: {
    minWidth: 82,
    borderWidth: 1,
    borderColor: "#111111",
    backgroundColor: "#111111",
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "flex-end",
  },
  ingredientTotalLabel: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  ingredientTotalValue: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  ingredientRows: {
    borderTopWidth: 1,
    borderTopColor: "rgba(17,17,17,0.18)",
    gap: 6,
  },
  ingredientRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(17,17,17,0.22)",
    paddingVertical: 7,
  },
  ingredientNameWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: 8,
  },
  ingredientIndex: {
    width: 20,
    color: "rgba(17,17,17,0.42)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
  },
  ingredientName: {
    flex: 1,
    color: "#111111",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  ingredientNameMuted: {
    color: "rgba(17,17,17,0.36)",
    textDecorationLine: "line-through",
  },
  ingredientGrams: {
    width: 44,
    color: "rgba(17,17,17,0.58)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    textAlign: "right",
  },
  ingredientCalories: {
    width: 76,
    color: "#111111",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  ingredientAdjustControls: {
    width: 57,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.18)",
    borderRadius: 16,
    backgroundColor: "rgba(17,17,17,0.055)",
    overflow: "hidden",
  },
  ingredientAdjustButton: {
    width: 28,
    height: 30,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  ingredientMinusButton: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(17,17,17,0.18)",
  },
  ingredientPlusButton: {
    backgroundColor: "transparent",
  },
  ingredientAdjustButtonPressed: {
    backgroundColor: "rgba(17,17,17,0.1)",
  },
  ingredientAdjustButtonDisabled: {
    opacity: 0.32,
  },
  ingredientAdjustText: {
    color: "#111111",
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "700",
  },
  ingredientMinusText: {
    color: "#111111",
  },
  ingredientPlusText: {
    color: "#111111",
  },
  ingredientEstimateNote: {
    marginTop: 10,
    color: "rgba(17,17,17,0.52)",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500",
  },
  ingredientMuted: {
    color: "rgba(17,17,17,0.58)",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
  },
  details: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 20,
    backgroundColor: dark.background,
  },
  optionGroup: {
    gap: 10,
  },
  sectionHeading: {
    gap: 4,
  },
  groupTitle: {
    color: dark.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
  },
  groupHint: {
    color: dark.faint,
    fontSize: 13,
    fontWeight: "700",
  },
  option: {
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionActive: {
    borderColor: dark.accent,
    backgroundColor: "rgba(255,77,69,0.14)",
  },
  optionPressed: {
    opacity: 0.82,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  optionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  optionCheckActive: {
    borderColor: dark.green,
    backgroundColor: dark.green,
  },
  optionName: {
    flex: 1,
    color: dark.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  optionNameActive: {
    color: dark.text,
  },
  optionPrice: {
    color: dark.muted,
    fontSize: 14,
    fontWeight: "800",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    backgroundColor: "rgba(5,5,5,0.95)",
    borderTopWidth: 1,
    borderTopColor: dark.border,
  },
  footerHint: {
    marginBottom: 8,
    color: dark.accent,
    fontSize: 13,
    fontWeight: "900",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addButton: {
    flex: 1,
    minHeight: 44,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingLeft: 12,
    paddingRight: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#000000",
    overflow: "hidden",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  addButtonMainContent: {
    paddingRight: 8,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  addButtonPriceBadge: {
    alignSelf: "stretch",
    paddingLeft: 12,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    flexDirection: "row",
  },
  addButtonPriceWrap: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addButtonDisabled: {
    opacity: 0.45,
  },
  addButtonText: {
    flexShrink: 1,
    color: "#111111",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  addButtonPrice: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  addPriceLineGreenStrike: {
    position: "absolute",
    left: -1,
    right: -1,
    top: "50%",
    marginTop: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#45E56B",
  },
});
