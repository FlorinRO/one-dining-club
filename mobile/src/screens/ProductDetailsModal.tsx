import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { ArrowLeft, Clock3, Flame, Heart, MessageSquareText, Share2, ShoppingBag, Truck } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
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

import { productsApi } from "../api/productsApi";
import { ProductCommentsSheet } from "../components/ProductCommentsSheet";
import { QuantityStepper } from "../components/QuantityStepper";
import { RestaurantAvatarImage } from "../components/RestaurantAvatarImage";
import { useI18n } from "../i18n/useI18n";
import { money } from "../lib/format";
import { resolveProductImageUri, resolveRestaurantImageUri } from "../lib/images";
import { buildProductShareUrl } from "../lib/productLinks";
import { HomeStackParamList } from "../navigation/types";
import { useCartStore } from "../store/cartStore";
import { useFavoritesStore } from "../store/favoritesStore";
import { showAppAlert } from "../store/uiStore";
import { colors } from "../theme/colors";
import { Product, Restaurant } from "../types/models";

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

const INGREDIENT_GRAM_STEP = 20;

const videoSourceForProduct = (product: Product): VideoSource | null =>
  product.video_url
    ? {
        uri: product.video_url,
        contentType: "progressive",
        useCaching: true,
      }
    : null;

const videoUriFromSource = (source: VideoSource): string | null => {
  if (source && typeof source === "object" && "uri" in source && typeof source.uri === "string") {
    return source.uri;
  }
  return null;
};

const hasServerSocial = (product: Product) =>
  typeof product.likes_count === "number" ||
  typeof product.comments_count === "number" ||
  typeof product.is_liked === "boolean";

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

const normalizeIngredientName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const roundUpToIngredientStep = (value: number, step = INGREDIENT_GRAM_STEP) => {
  if (value <= 0) return 0;
  return Math.ceil(value / step) * step;
};

const inferIngredientAdjustmentRules = (name: string, grams: number, productType?: string | null) => {
  if (!grams) {
    return { canReduce: true, minGrams: 0 };
  }

  const normalizedName = normalizeIngredientName(name);
  const normalizedProductType = String(productType ?? "").trim().toLowerCase();
  const pizzaBaseKeywords = ["blat", "aluat"];
  const nonRemovableKeywords = [
    "chifla",
    "brioche",
    "bun",
    "lipie",
    "tortilla",
    "wrap",
    "bagheta",
    "paine",
    "toast",
    "focaccia",
    "taco shell",
    "nori",
  ];
  const reducibleBaseKeywords = [
    "orez",
    "paste",
    "spaghete",
    "penne",
    "fusilli",
    "rigatoni",
    "tagliatelle",
    "fettuccine",
    "linguine",
    "ravioli",
    "tortellini",
    "gnocchi",
    "lasagna",
    "cuscus",
    "bulgur",
    "quinoa",
    "orz",
    "ovaz",
    "taitei",
    "ramen",
    "orez jasmine",
    "orez basmati",
    "orez pentru sushi",
  ];

  if (normalizedProductType === "pizza" && pizzaBaseKeywords.some((keyword) => normalizedName.includes(keyword))) {
    return {
      canReduce: true,
      minGrams: Math.min(grams, Math.max(roundUpToIngredientStep(grams * 0.5), INGREDIENT_GRAM_STEP)),
    };
  }

  if (nonRemovableKeywords.some((keyword) => normalizedName.includes(keyword))) {
    return { canReduce: false, minGrams: grams };
  }

  if (reducibleBaseKeywords.some((keyword) => normalizedName.includes(keyword))) {
    return {
      canReduce: true,
      minGrams: Math.min(grams, Math.max(roundUpToIngredientStep(grams * 0.5), INGREDIENT_GRAM_STEP)),
    };
  }

  return { canReduce: true, minGrams: 0 };
};

type ParsedIngredientRow = {
  id: string;
  name: string;
  baseGrams: number;
  baseCalories: number | null;
  pricePer20g: number;
  canAddExtra: boolean;
  canReduce: boolean;
  minGrams: number;
  hasStructuredValues: boolean;
};

type IngredientDetailsEntry = NonNullable<Product["ingredient_details"]>[number] & {
  pricePer20g?: string | number | null;
  extra_price_per_20g?: string | number | null;
  extraPricePer20g?: string | number | null;
  canAddExtra?: boolean;
  extra_available?: boolean;
  can_order_extra?: boolean;
  canReduce?: boolean;
  minGrams?: number | null;
};

const resolveIngredientPricePer20g = (item: IngredientDetailsEntry) => {
  const rawValue =
    item.price_per_20g ??
    item.pricePer20g ??
    item.extra_price_per_20g ??
    item.extraPricePer20g ??
    null;
  return rawValue != null ? Number(rawValue) || 0 : 0;
};

const resolveIngredientCanAddExtra = (item: IngredientDetailsEntry) => {
  if (item.can_add_extra === false) return false;
  if (item.canAddExtra === false) return false;
  if (item.extra_available === false) return false;
  if (item.can_order_extra === false) return false;
  return true;
};

const resolveIngredientCanReduce = (item: IngredientDetailsEntry, fallbackCanReduce: boolean) => {
  if (item.can_reduce === false) return false;
  if (item.canReduce === false) return false;
  if (item.can_reduce === true || item.canReduce === true) return true;
  return fallbackCanReduce;
};

const resolveIngredientMinGrams = (item: IngredientDetailsEntry, baseGrams: number, fallbackMinGrams: number) => {
  const rawValue = item.min_grams ?? item.minGrams ?? null;
  if (rawValue == null) return Math.max(0, Math.min(baseGrams, fallbackMinGrams));
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return Math.max(0, Math.min(baseGrams, fallbackMinGrams));
  return Math.max(0, Math.min(baseGrams, parsed));
};

const parseStructuredIngredientEntry = (value: string, index: number, productType?: string | null): ParsedIngredientRow | null => {
  const entry = value.trim();
  if (!entry) return null;

  const match = entry.match(/^(.*?)(?:\s+(\d+)g)?(?:\s+(\d+)\s*kcal)?$/i);
  if (!match) {
    return {
      id: `${index}-${entry.toLowerCase()}`,
      name: capitalizeIngredient(entry),
      baseGrams: 0,
      baseCalories: null,
      pricePer20g: 0,
      canAddExtra: true,
      ...inferIngredientAdjustmentRules(entry, 0, productType),
      hasStructuredValues: false,
    };
  }

  const name = capitalizeIngredient((match[1] || "").trim());
  const grams = match[2] ? Number(match[2]) : null;
  const calories = match[3] ? Number(match[3]) : null;
  const baseGrams = grams && Number.isFinite(grams) ? grams : 0;
  const adjustmentRules = inferIngredientAdjustmentRules(name, baseGrams, productType);

  return {
    id: `${index}-${name.toLowerCase()}`,
    name,
    baseGrams,
    baseCalories: calories && Number.isFinite(calories) ? calories : null,
    pricePer20g: 0,
    canAddExtra: true,
    canReduce: adjustmentRules.canReduce,
    minGrams: adjustmentRules.minGrams,
    hasStructuredValues: Number.isFinite(grams) || Number.isFinite(calories),
  };
};

export function ProductDetailsModal({ navigation, route }: Props) {
  const { tr } = useI18n();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { product: initialProduct, restaurant } = route.params;
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const [productSocial, setProductSocial] = useState<Partial<Pick<Product, "likes_count" | "comments_count" | "is_liked">>>({
    likes_count: initialProduct.likes_count,
    comments_count: initialProduct.comments_count,
    is_liked: initialProduct.is_liked,
  });
  const product = useMemo<Product>(() => ({ ...initialProduct, ...productDetails, ...productSocial }), [initialProduct, productDetails, productSocial]);
  const isBrand = restaurant.entity_type === "brand";
  const isSponsored = Boolean(restaurant.is_sponsored);
  const addItem = useCartStore((state) => state.addItem);
  const cartRestaurant = useCartStore((state) => state.restaurant);
  const isLocalFavorite = useFavoritesStore((state) => state.isProductFavorite(initialProduct.id));
  const toggleProductFavorite = useFavoritesStore((state) => state.toggleProduct);
  const [quantity, setQuantity] = useState(1);
  const [ingredientGramOverrides, setIngredientGramOverrides] = useState<Record<string, number>>({});
  const [isCommentsSheetVisible, setIsCommentsSheetVisible] = useState(false);
  const basePrice = product.effective_price ?? product.discount_price ?? product.price;
  const heroHeight = Math.max(470, Math.round(height * 0.67));
  const videoSource = useMemo(() => videoSourceForProduct(product), [product]);
  const videoUri = useMemo(() => videoUriFromSource(videoSource), [videoSource]);
  const heroImageUri = useMemo(
    () => resolveProductImageUri(product.image, product.id) || resolveRestaurantImageUri(restaurant.cover_image, restaurant.id, restaurant),
    [product.id, product.image, restaurant],
  );
  const productNutrition = product as unknown as {
    ingredients?: string | string[];
    ingredient_details?: Product["ingredient_details"];
    calories?: number | string;
  };
  const structuredIngredientRows = useMemo(() => {
    if (Array.isArray(productNutrition.ingredient_details) && productNutrition.ingredient_details.length) {
      return productNutrition.ingredient_details
        .map((item, index) => {
          const name = capitalizeIngredient(String(item.name || ""));
          const baseGrams = Number(item.grams ?? 0) || 0;
          const inferredRules = inferIngredientAdjustmentRules(name, baseGrams, product.product_type);
          return {
            id: `${index}-${String(item.name || "").toLowerCase()}`,
            name,
            baseGrams,
            baseCalories: item.calories != null ? Number(item.calories) || 0 : null,
            pricePer20g: resolveIngredientPricePer20g(item as IngredientDetailsEntry),
            canAddExtra: resolveIngredientCanAddExtra(item as IngredientDetailsEntry),
            canReduce: resolveIngredientCanReduce(item as IngredientDetailsEntry, inferredRules.canReduce),
            minGrams: resolveIngredientMinGrams(item as IngredientDetailsEntry, baseGrams, inferredRules.minGrams),
            hasStructuredValues: true,
          };
        })
        .filter((item) => item.name)
        .slice(0, 8);
    }
    return [];
  }, [product.product_type, productNutrition.ingredient_details]);
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
  const allergenList = useMemo(() => {
    if (typeof product.allergens !== "string") {
      return [];
    }
    return product.allergens
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }, [product.allergens]);
  const ingredientRows = useMemo(() => {
    if (structuredIngredientRows.length) {
      return structuredIngredientRows.map((item, index) => ({
        ...item,
        baseGrams: Math.max(0, item.baseGrams),
        sortIndex: index,
      }));
    }

    const parsedRows = ingredientList
      .map((entry, index) => parseStructuredIngredientEntry(entry, index, product.product_type))
      .filter((item): item is ParsedIngredientRow => Boolean(item));
    const hasStructuredRows = parsedRows.some((item) => item.hasStructuredValues);

    if (hasStructuredRows) {
      return parsedRows.map((item, index) => ({
        id: item.id,
        name: item.name,
        baseCalories: item.baseCalories,
        baseGrams: Math.max(0, item.baseGrams),
        pricePer20g: item.pricePer20g,
        canAddExtra: item.canAddExtra,
        canReduce: item.canReduce,
        minGrams: item.minGrams,
        hasStructuredValues: true,
        sortIndex: index,
      }));
    }

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
      pricePer20g: 0,
      canAddExtra: true,
      canReduce: true,
      minGrams: 0,
      hasStructuredValues: false,
      sortIndex: index,
    }));
  }, [ingredientList, product.product_type, structuredIngredientRows, productNutrition.calories]);
  const adjustedIngredientRows = useMemo(
    () =>
      ingredientRows.map((ingredient) => {
        const baseGrams = ingredient.baseGrams;
        const grams = ingredientGramOverrides[ingredient.id] ?? baseGrams;
        const extraGrams = ingredient.canAddExtra ? Math.max(0, grams - baseGrams) : 0;
        const priceAdjustment = ingredient.pricePer20g > 0 ? (extraGrams / INGREDIENT_GRAM_STEP) * ingredient.pricePer20g : 0;
        return {
          ...ingredient,
          grams,
          priceAdjustment,
          calories:
            ingredient.baseCalories != null && baseGrams > 0
              ? Math.round((ingredient.baseCalories * grams) / baseGrams)
              : ingredient.baseCalories != null && baseGrams === 0
                ? ingredient.baseCalories
              : null,
        };
      }),
    [ingredientGramOverrides, ingredientRows],
  );
  const ingredientPriceAdjustment = useMemo(
    () => adjustedIngredientRows.reduce((sum, ingredient) => sum + (ingredient.priceAdjustment ?? 0), 0),
    [adjustedIngredientRows],
  );
  const adjustedTotalGrams = useMemo(
    () => adjustedIngredientRows.reduce((sum, ingredient) => sum + ingredient.grams, 0),
    [adjustedIngredientRows],
  );
  const adjustedCaloriesText = useMemo(() => {
    const totalCalories = parseCaloriesValue(productNutrition.calories);
    const structuredCalories = adjustedIngredientRows.reduce((sum, ingredient) => sum + (ingredient.calories ?? 0), 0);
    const hasIngredientCalories = adjustedIngredientRows.some((ingredient) => ingredient.calories != null);
    if (hasIngredientCalories) {
      return `${Math.max(0, Math.round(structuredCalories))} kcal`;
    }
    if (totalCalories == null) {
      return tr("Nedisponibil", "Unavailable");
    }
    return `${Math.max(0, Math.round(totalCalories))} kcal`;
  }, [adjustedIngredientRows, productNutrition.calories, tr]);
  const player = useVideoPlayer(videoSource, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.volume = 0;
    videoPlayer.audioMixingMode = "mixWithOthers";
  });

  useEffect(() => {
    let isMounted = true;
    productsApi
      .detail(initialProduct.id)
      .then((nextProduct) => {
        if (isMounted) setProductDetails(nextProduct);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [initialProduct.id]);

  useEffect(() => {
    if (!videoSource) {
      return undefined;
    }

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
  }, [player, videoSource]);

  const total = useMemo(() => {
    const base = Number(basePrice);
    return (base + ingredientPriceAdjustment) * quantity;
  }, [basePrice, ingredientPriceAdjustment, quantity]);

  const isAvailable = product.is_available !== false;
  const canSubmit = isAvailable;

  const shareProduct = async () => {
    const shareUrl = buildProductShareUrl(product.id);
    await Share.share({
      title: product.name,
      message: `${product.name} · ${restaurant.name}\n${product.description}`,
      url: shareUrl,
    });
  };

  const onFavoritePress = () => {
    if (!hasServerSocial(product)) {
      toggleProductFavorite(product.id);
      return;
    }

    const currentLiked = Boolean(product.is_liked);
    const currentLikes = product.likes_count ?? 0;
    const nextLiked = !currentLiked;
    setProductSocial((current) => ({
      ...current,
      is_liked: nextLiked,
      likes_count: Math.max(0, currentLikes + (nextLiked ? 1 : -1)),
    }));

    productsApi
      .toggleLike(product.id)
      .then((summary) => {
        setProductSocial((current) => ({
          ...current,
          is_liked: summary.is_liked,
          likes_count: summary.likes_count,
          comments_count: summary.comments_count,
        }));
      })
      .catch(() => {
        setProductSocial((current) => ({
          ...current,
          is_liked: currentLiked,
          likes_count: currentLikes,
        }));
      });
  };

  const onCommentPress = () => {
    setIsCommentsSheetVisible(true);
  };

  const adjustIngredientGrams = (ingredientId: string, direction: -1 | 1) => {
    const ingredient = adjustedIngredientRows.find((item) => item.id === ingredientId);
    if (!ingredient) return;

    setIngredientGramOverrides((current) => {
      const currentGrams = current[ingredientId] ?? ingredient.baseGrams;
      const maxGrams = ingredient.canAddExtra
        ? Math.max(ingredient.baseGrams * 2, ingredient.baseGrams || INGREDIENT_GRAM_STEP)
        : ingredient.baseGrams;
      const minGrams = ingredient.canReduce ? ingredient.minGrams : ingredient.baseGrams;
      const nextGrams = Math.min(maxGrams, Math.max(minGrams, currentGrams + direction * INGREDIENT_GRAM_STEP));

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
          `Ingrediente ajustate: ${adjustedIngredients.map((ingredient) => `${ingredient.name} ${ingredient.grams}g${ingredient.priceAdjustment ? ` (+${money(ingredient.priceAdjustment)})` : ""}`).join(", ")}`,
          `Adjusted ingredients: ${adjustedIngredients.map((ingredient) => `${ingredient.name} ${ingredient.grams}g${ingredient.priceAdjustment ? ` (+${money(ingredient.priceAdjustment)})` : ""}`).join(", ")}`,
        )
      : undefined;
    const proceedToAdd = () => {
      addItem({
        product,
        restaurant,
        quantity,
        selectedOptions: [],
        ingredientPriceAdjustment,
        notes: adjustedIngredientsNote,
        mediaVideoUrl: videoUri,
      });
      navigation.goBack();
    };

    if (cartRestaurant && cartRestaurant.id !== restaurant.id) {
      showAppAlert(
        tr("Înlocuiești coșul?", "Replace cart?"),
        tr(
          `Coșul tău are produse de la ${cartRestaurant.name}. Dacă adaugi de la ${restaurant.name}, coșul va fi golit și înlocuit cu noul produs.`,
          `Your cart contains items from ${cartRestaurant.name}. If you add from ${restaurant.name}, the cart will be cleared and replaced with the new item.`,
        ),
        [
          { text: tr("Renunță", "Cancel"), style: "cancel" },
          { text: tr("Continuă", "Continue"), style: "destructive", onPress: proceedToAdd },
        ],
      );
      return;
    }

    proceedToAdd();
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
          {videoSource ? (
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
          ) : (
            <Image source={{ uri: heroImageUri }} style={styles.video} resizeMode="cover" />
          )}
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
                <Heart
                  size={20}
                  stroke={(product.is_liked ?? isLocalFavorite) ? "#EF4444" : dark.text}
                  fill={(product.is_liked ?? isLocalFavorite) ? "#EF4444" : "transparent"}
                />
              </Pressable>
              <Pressable onPress={onCommentPress} style={styles.roundIconButton}>
                <MessageSquareText size={20} stroke={dark.text} />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.creatorRow}>
              <RestaurantAvatarImage restaurant={restaurant} style={styles.creatorAvatar} />
              <View style={styles.creatorText}>
                <Text numberOfLines={1} style={styles.creatorName}>{restaurant.name}</Text>
                <Text numberOfLines={1} style={styles.creatorMeta}>
                  {isBrand
                    ? product.product_type_label || product.category_name || tr("Colecție promovată", "Promoted collection")
                    : product.product_type_label || product.category_name || tr("Recomandarea bucătarului", "Chef pick")}
                </Text>
              </View>
              {isSponsored ? (
                <View style={styles.sponsoredPill}>
                  <Text style={styles.sponsoredPillText}>{tr("Sponsorizat", "Sponsored")}</Text>
                </View>
              ) : null}
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
                    <View style={styles.ingredientMetaRow}>
                      <Text style={styles.ingredientGrams}>{ingredient.grams}g</Text>
                      <Text style={styles.ingredientCalories}>
                        {ingredient.calories != null ? `~${ingredient.calories} kcal` : tr("kcal n/a", "kcal n/a")}
                      </Text>
                      {ingredient.pricePer20g > 0 ? (
                        <Text style={styles.ingredientPriceHint}>{`+${money(ingredient.pricePer20g)}/20g`}</Text>
                      ) : (
                        <Text style={styles.ingredientPriceHintPlaceholder}> </Text>
                      )}
                      <View style={styles.ingredientAdjustControls}>
                        <Pressable
                          disabled={ingredient.grams <= (ingredient.canReduce ? ingredient.minGrams : ingredient.baseGrams)}
                          onPress={() => adjustIngredientGrams(ingredient.id, -1)}
                          hitSlop={8}
                          style={({ pressed }) => [
                            styles.ingredientAdjustButton,
                            styles.ingredientMinusButton,
                            (ingredient.grams <= (ingredient.canReduce ? ingredient.minGrams : ingredient.baseGrams)) &&
                              styles.ingredientAdjustButtonDisabled,
                            pressed &&
                              ingredient.grams > (ingredient.canReduce ? ingredient.minGrams : ingredient.baseGrams) &&
                              styles.ingredientAdjustButtonPressed,
                          ]}
                        >
                          <Text style={[styles.ingredientAdjustText, styles.ingredientMinusText]}>-</Text>
                        </Pressable>
                        <Pressable
                          disabled={
                            ingredient.grams >=
                            (ingredient.canAddExtra
                              ? Math.max(ingredient.baseGrams * 2, ingredient.baseGrams || INGREDIENT_GRAM_STEP)
                              : ingredient.baseGrams)
                          }
                          onPress={() => adjustIngredientGrams(ingredient.id, 1)}
                          hitSlop={8}
                          style={({ pressed }) => [
                            styles.ingredientAdjustButton,
                            styles.ingredientPlusButton,
                            (ingredient.grams >=
                              (ingredient.canAddExtra
                                ? Math.max(ingredient.baseGrams * 2, ingredient.baseGrams || INGREDIENT_GRAM_STEP)
                                : ingredient.baseGrams)) &&
                              styles.ingredientAdjustButtonDisabled,
                            pressed &&
                              ingredient.grams <
                                (ingredient.canAddExtra
                                  ? Math.max(ingredient.baseGrams * 2, ingredient.baseGrams || INGREDIENT_GRAM_STEP)
                                  : ingredient.baseGrams) &&
                              styles.ingredientAdjustButtonPressed,
                          ]}
                        >
                          <Text style={[styles.ingredientAdjustText, styles.ingredientPlusText]}>+</Text>
                        </Pressable>
                      </View>
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

            {allergenList.length ? (
              <View style={styles.allergenSection}>
                <Text style={styles.allergenTitle}>{tr("Alergeni", "Allergens")}</Text>
                <View style={styles.allergenChips}>
                  {allergenList.map((allergen) => (
                    <View key={allergen} style={styles.allergenChip}>
                      <Text style={styles.allergenChipText}>{allergen}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </View>

      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
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
                    + {tr(isBrand ? "Cumpără" : "Adaugă", isBrand ? "Buy" : "Add")}
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

      <ProductCommentsSheet
        visible={isCommentsSheetVisible}
        restaurant={restaurant}
        product={product}
        onClose={() => setIsCommentsSheetVisible(false)}
        onProductSocialChange={(productId, patch) => {
          if (productId === product.id) {
            setProductSocial((current) => ({ ...current, ...patch }));
          }
        }}
      />
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
  sponsoredPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sponsoredPillText: {
    color: dark.text,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
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
  allergenSection: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(17,17,17,0.18)",
    paddingTop: 12,
  },
  allergenTitle: {
    color: "#111111",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  allergenChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allergenChip: {
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.18)",
    backgroundColor: "rgba(17,17,17,0.06)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  allergenChipText: {
    color: "#111111",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  ingredientRow: {
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(17,17,17,0.22)",
    paddingVertical: 9,
  },
  ingredientNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: 8,
  },
  ingredientMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 28,
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
  ingredientPriceHint: {
    width: 74,
    color: "rgba(17,17,17,0.54)",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  ingredientPriceHintPlaceholder: {
    width: 74,
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
