import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChevronLeft, ChevronRight, CreditCard, LifeBuoy, RotateCcw, Star } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ordersApi } from "../api/ordersApi";
import { restaurantsApi } from "../api/restaurantsApi";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { formatDateTime } from "../lib/dateFormat";
import { OrdersStackParamList } from "../navigation/types";
import { CartItem, useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import { useOrdersStore } from "../store/ordersStore";
import { colors } from "../theme/colors";
import { Order, Product, ProductOption, ProductOptionGroup, Restaurant } from "../types/models";

type Props = NativeStackScreenProps<OrdersStackParamList, "OrderDetails">;
const ORDER_ACTION_GREEN = "#22C55E";

export function OrderDetailsScreen({ navigation, route }: Props) {
  const { tr, language } = useI18n();
  const insets = useSafeAreaInsets();
  const topOverlayHeight = insets.top + 1;
  const bottomSafeSpacing = Math.max(insets.bottom, 18) + 86;
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();
  const accessToken = useAuthStore((state) => state.accessToken);
  const cartRestaurant = useCartStore((state) => state.restaurant);
  const replaceCart = useCartStore((state) => state.replaceCart);
  const updateStoredOrder = useOrdersStore((state) => state.updateOrder);

  const [order, setOrder] = useState<Order>(route.params.order);
  const [review, setReview] = useState(route.params.order.review ?? null);
  const [ratingDraft, setRatingDraft] = useState(route.params.order.review?.rating ?? 0);
  const [reviewComment, setReviewComment] = useState(route.params.order.review?.comment ?? "");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    let active = true;

    ordersApi
      .detail(route.params.order.id)
      .then((freshOrder) => {
        if (!active) return;
        setOrder(freshOrder);
        setReview(freshOrder.review ?? null);
        setRatingDraft(freshOrder.review?.rating ?? 0);
        setReviewComment(freshOrder.review?.comment ?? "");
        updateStoredOrder(freshOrder);
      })
      .catch(() => {
        // Keep the route snapshot when the network refresh fails.
      });

    return () => {
      active = false;
    };
  }, [route.params.order.id, updateStoredOrder]);

  const safeOrderId = typeof order?.id === "number" ? order.id : 0;
  const safeOrderItems = Array.isArray(order?.items) ? order.items : [];
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const fulfillmentType = order.fulfillment_type ?? "delivery";
  const isPickupOrder = fulfillmentType === "pickup";
  const addressObject = order.address && typeof order.address === "object" ? order.address : null;
  const serviceFee = Math.max(0, Math.round(subtotal * 0.02 * 100) / 100);
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const total = Number(order.total || 0);
  const orderCode = `#${`I${safeOrderId.toString(36).toUpperCase()}`}`;
  const statusLabel = order.order_status === "delivered" ? tr("Livrată", "Delivered") : tr("În curs", "In progress");
  const formattedDate = formatDateTime(order.created_at, language === "en" ? "en-US" : "ro-RO", tr("Dată necunoscută", "Unknown date"));
  const primaryAddress = addressObject ? `${addressObject.address_line_1}, ${addressObject.city}` : tr("Adresă salvată", "Saved address");
  const extraAddressLines = addressObject ? [addressObject.address_line_2, addressObject.instructions].filter(Boolean) : [];
  const paymentLabel = order.payment_method === "cash" ? tr("Plată cash", "Cash payment") : tr("Plată online", "Online payment");
  const canSubmitReview = Boolean(accessToken) && order.order_status === "delivered";

  const submitReview = async () => {
    if (!canSubmitReview || isSubmittingReview) return;
    if (ratingDraft < 1) {
      Alert.alert(tr("Alege un rating", "Choose a rating"), tr("Selectează între 1 și 5 stele.", "Select 1 to 5 stars."));
      return;
    }

    setIsSubmittingReview(true);
    try {
      const savedReview = await ordersApi.review(order.id, {
        rating: ratingDraft,
        comment: reviewComment.trim(),
      });
      const updatedOrder = { ...order, review: savedReview };
      setReview(savedReview);
      setOrder(updatedOrder);
      updateStoredOrder(updatedOrder);
      Alert.alert(tr("Mulțumim", "Thank you"), tr("Ratingul a fost salvat.", "Your rating was saved."));
    } catch {
      Alert.alert(tr("Eroare", "Error"), tr("Nu am putut salva ratingul.", "Could not save the rating."));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const openRestaurantMenu = useCallback(
    async (restaurantOverride?: Restaurant, productsOverride?: Product[]) => {
      const restaurant = restaurantOverride ?? (await restaurantsApi.detail(order.restaurant));
      const products = productsOverride ?? (await restaurantsApi.products(restaurant.id));
      navigation.getParent()?.navigate("HomeTab", {
        screen: "RestaurantDetails",
        params: { restaurant, products },
      });
    },
    [navigation, order.restaurant],
  );

  const openSupport = useCallback(() => {
    navigation.getParent()?.navigate("ProfileTab", {
      screen: "ProfileInfo",
      params: { topic: "support" },
    });
  }, [navigation]);

  const openCart = useCallback(() => {
    navigation.getParent()?.navigate("HomeTab", {
      screen: "CartFlow",
      params: { screen: "CartHome" },
    });
  }, [navigation]);

  const handleOrderAgain = useCallback(async () => {
    if (isReordering) return;

    setIsReordering(true);
    try {
      const restaurant = await restaurantsApi.detail(order.restaurant);
      const products = await restaurantsApi.products(restaurant.id);
      const { items, missingProducts, unresolvedProducts } = buildReorderCartItems(order, restaurant, products);

      if (!items.length) {
        Alert.alert(
          tr("Comanda nu poate fi refăcută", "Order cannot be rebuilt"),
          tr(
            "Produsele din această comandă nu mai sunt disponibile în forma inițială. Deschidem meniul restaurantului ca să alegi din nou.",
            "Items from this order are no longer available in their original form. Opening the restaurant menu so you can choose again.",
          ),
          [{ text: "OK", onPress: () => void openRestaurantMenu(restaurant, products) }],
        );
        return;
      }

      const applyCart = () => {
        replaceCart({ restaurant, items, promoCode: "" });

        if (missingProducts.length || unresolvedProducts.length) {
          Alert.alert(
            tr("Comandă refăcută parțial", "Order rebuilt partially"),
            buildPartialReorderMessage({ tr, missingProducts, unresolvedProducts }),
            [{ text: "OK", onPress: openCart }],
          );
          return;
        }

        openCart();
      };

      if (cartRestaurant && cartRestaurant.id !== restaurant.id) {
        Alert.alert(
          tr("Înlocuiești coșul?", "Replace cart?"),
          tr(
            `Coșul tău are produse de la ${cartRestaurant.name}. Dacă refaci comanda de la ${restaurant.name}, coșul curent va fi înlocuit.`,
            `Your cart contains items from ${cartRestaurant.name}. Reordering from ${restaurant.name} will replace the current cart.`,
          ),
          [
            { text: tr("Renunță", "Cancel"), style: "cancel" },
            { text: tr("Continuă", "Continue"), style: "destructive", onPress: applyCart },
          ],
        );
        return;
      }

      applyCart();
    } catch {
      Alert.alert(
        tr("Nu am putut reface comanda", "Could not rebuild the order"),
        tr("Verifică conexiunea și încearcă din nou.", "Check your connection and try again."),
      );
    } finally {
      setIsReordering(false);
    }
  }, [cartRestaurant, isReordering, navigation, openCart, openRestaurantMenu, order, replaceCart, tr]);

  return (
    <View style={styles.page}>
      <View pointerEvents="none" style={[styles.statusBarMask, { height: topOverlayHeight }]} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={trackFloatingCartScrollDirection}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingTop: topOverlayHeight + 6, paddingBottom: bottomSafeSpacing }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
            <ChevronLeft size={26} color={colors.text} strokeWidth={2.4} />
          </Pressable>
        </View>
        <View style={[styles.card, styles.topInfoCard]}>
          <Text style={styles.metaText}>
            {statusLabel} {formattedDate}
          </Text>
          <Text style={styles.orderCode}>{tr("Comanda", "Order")} {orderCode}</Text>

          {safeOrderItems.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {Number(item.quantity || 0)} x {String(item.product_name ?? "").toUpperCase() || tr("PRODUS", "PRODUCT")}
              </Text>
              <Text style={styles.itemPrice}>{money(item.total_price)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <SummaryRow label={tr("Reducere", "Discount")} value={`-${money(discount)}`} />
          <SummaryRow label="Subtotal" value={money(subtotalAfterDiscount)} strong />
          <SummaryRow label={tr("Taxă servicii", "Service fee")} value={money(serviceFee)} />
          <SummaryRow label={tr("Taxă livrare", "Delivery fee")} value={money(deliveryFee)} />
          <View style={styles.divider} />
          <SummaryRow label="Total" value={money(total)} large />
          <View style={styles.paymentRow}>
            <View style={styles.paymentLeft}>
              <View style={styles.paymentIconWrap}>
                <CreditCard size={20} color="#8A5A2B" strokeWidth={2.2} />
              </View>
              <Text style={styles.paymentLabel}>{paymentLabel}</Text>
            </View>
            <Text style={styles.paymentValue}>{money(total)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{isPickupOrder ? tr("Ridicare", "Pickup") : tr("Adresa de livrare", "Delivery address")}</Text>
          {isPickupOrder ? (
            <Text style={styles.addressMain}>{tr("Comanda se ridică direct din locație.", "This order will be picked up directly from the restaurant.")}</Text>
          ) : (
            <>
              <Text style={styles.addressMain}>{primaryAddress}</Text>
              {extraAddressLines.map((line) => (
                <Text key={line} style={styles.addressMuted}>
                  {line}
                </Text>
              ))}
            </>
          )}
        </View>

        <Pressable style={styles.card} onPress={() => void openRestaurantMenu()}>
          <Text style={styles.sectionTitle}>{order.restaurant_name}</Text>
          <View style={styles.menuRow}>
            <Text style={styles.menuText}>{tr("Vezi meniul", "View menu")}</Text>
            <ChevronRight size={34} color={colors.muted} strokeWidth={1.8} />
          </View>
        </Pressable>

        {canSubmitReview ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {review ? tr("Ratingul tău", "Your rating") : tr("Evaluează comanda", "Rate this order")}
            </Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable key={value} hitSlop={8} onPress={() => setRatingDraft(value)} style={styles.starButton}>
                  <Star
                    size={30}
                    color={value <= ratingDraft ? colors.warning : colors.muted}
                    fill={value <= ratingDraft ? colors.warning : "transparent"}
                    strokeWidth={2}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder={tr("Spune pe scurt cum a fost.", "Briefly say how it was.")}
              placeholderTextColor={colors.muted}
              multiline
              style={styles.reviewInput}
            />
            <Pressable
              disabled={isSubmittingReview}
              style={[styles.reviewButton, isSubmittingReview && styles.reviewButtonDisabled]}
              onPress={submitReview}
            >
              <Text style={styles.reviewButtonText}>
                {isSubmittingReview
                  ? tr("Se salvează...", "Saving...")
                  : review
                    ? tr("Actualizează rating", "Update rating")
                    : tr("Trimite rating", "Submit rating")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.actionsCard}>
          <View style={styles.actionsBlock}>
            <Pressable style={[styles.orderAgainButton, isReordering && styles.orderAgainButtonDisabled]} onPress={() => void handleOrderAgain()} disabled={isReordering}>
              <View style={styles.actionButtonContent}>
                <RotateCcw size={15} color={ORDER_ACTION_GREEN} strokeWidth={2.4} />
                <Text style={styles.orderAgainText}>{isReordering ? tr("Se reface...", "Rebuilding...") : tr("Comandă din nou", "Order again")}</Text>
              </View>
            </Pressable>
            <Pressable style={styles.helpButton} onPress={openSupport}>
              <View style={styles.actionButtonContent}>
                <LifeBuoy size={15} color={colors.text} strokeWidth={2.4} />
                <Text style={styles.helpText}>{tr("Ajutor", "Help")}</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function money(value: string | number) {
  return `${Number(value).toFixed(2).replace(".", ",")} lei`;
}

function minimumRequiredForGroup(group: ProductOptionGroup) {
  return Math.max(group.min_select, group.is_required ? 1 : 0);
}

function selectedCountForGroup(selectedOptions: ProductOption[], group: ProductOptionGroup) {
  const optionIds = new Set(group.options.map((option) => option.id));
  return selectedOptions.filter((option) => optionIds.has(option.id)).length;
}

function normalizeOptionText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toOptionPrice(value: string | number) {
  return Number(Number(value ?? 0).toFixed(2));
}

function buildReorderCartItems(order: Order, restaurant: Restaurant, products: Product[]) {
  const items: CartItem[] = [];
  const missingProducts: string[] = [];
  const unresolvedProducts: string[] = [];
  const productsById = new Map(products.map((product) => [product.id, product]));

  for (const orderItem of order.items ?? []) {
    const product = productsById.get(orderItem.product);
    if (!product || product.is_available === false) {
      missingProducts.push(orderItem.product_name);
      continue;
    }

    const availableOptions = (product.option_groups ?? []).flatMap((group) => group.options).filter((option) => option.is_available !== false);
    const usedOptionIds = new Set<number>();
    const selectedOptions: ProductOption[] = [];
    let unresolvedOption = false;

    for (const savedOption of orderItem.options ?? []) {
      const match = availableOptions.find(
        (option) =>
          !usedOptionIds.has(option.id) &&
          normalizeOptionText(option.name) === normalizeOptionText(savedOption.option_name) &&
          toOptionPrice(option.extra_price) === toOptionPrice(savedOption.extra_price),
      );

      if (!match) {
        unresolvedOption = true;
        break;
      }

      usedOptionIds.add(match.id);
      selectedOptions.push(match);
    }

    if (unresolvedOption) {
      unresolvedProducts.push(orderItem.product_name);
      continue;
    }

    const missingRequiredGroups = (product.option_groups ?? []).some(
      (group) => minimumRequiredForGroup(group) > 0 && selectedCountForGroup(selectedOptions, group) < minimumRequiredForGroup(group),
    );
    if (missingRequiredGroups) {
      unresolvedProducts.push(orderItem.product_name);
      continue;
    }

    const itemId = [
        product.id,
        ...selectedOptions.map((option) => option.id).sort((a, b) => a - b),
        orderItem.notes?.trim() ? `notes=${orderItem.notes.trim()}` : "",
      ]
        .filter(Boolean)
        .join(":");
    const existingItem = items.find((item) => item.id === itemId);

    if (existingItem) {
      existingItem.quantity += Math.max(1, Number(orderItem.quantity || 1));
      continue;
    }

    items.push({
      id: itemId,
      product,
      restaurant,
      quantity: Math.max(1, Number(orderItem.quantity || 1)),
      selectedOptions,
      notes: orderItem.notes,
      mediaVideoUrl: product.video_url,
    });
  }

  return { items, missingProducts, unresolvedProducts };
}

function buildPartialReorderMessage({
  tr,
  missingProducts,
  unresolvedProducts,
}: {
  tr: (ro: string, en: string) => string;
  missingProducts: string[];
  unresolvedProducts: string[];
}) {
  const parts: string[] = [];

  if (missingProducts.length) {
    parts.push(
      tr(
        `Nu mai sunt disponibile: ${missingProducts.join(", ")}.`,
        `No longer available: ${missingProducts.join(", ")}.`,
      ),
    );
  }

  if (unresolvedProducts.length) {
    parts.push(
      tr(
        `Au nevoie de reselectarea opțiunilor: ${unresolvedProducts.join(", ")}.`,
        `Their options need to be selected again: ${unresolvedProducts.join(", ")}.`,
      ),
    );
  }

  parts.push(
    tr(
      "Am pus în coș doar produsele care au putut fi reconstruite exact.",
      "Only the items that could be rebuilt exactly were added to the cart.",
    ),
  );

  return parts.join(" ");
}

function SummaryRow({ label, value, strong, large }: { label: string; value: string; strong?: boolean; large?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong && styles.summaryLabelStrong, large && styles.summaryLabelLarge]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryValueStrong, large && styles.summaryValueLarge]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBarMask: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 20,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 28,
    gap: 8,
    backgroundColor: colors.background,
  },
  headerRow: {
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 20,
    backgroundColor: colors.card,
    marginHorizontal: 0,
    gap: 12,
  },
  topInfoCard: {
    paddingTop: 30,
    marginTop: 0,
  },
  metaText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
  orderCode: {
    marginTop: 8,
    color: colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "700",
  },
  itemRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  itemName: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  itemPrice: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  summaryLabelStrong: {
    fontWeight: "700",
  },
  summaryValue: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  summaryValueStrong: {
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: colors.border,
  },
  summaryLabelLarge: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
  },
  summaryValueLarge: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
  },
  paymentRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  paymentIconWrap: {
    width: 40,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#E8C790",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentLabel: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  paymentValue: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  addressMain: {
    marginTop: 6,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  addressMuted: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  menuRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  starButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewInput: {
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  reviewButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: ORDER_ACTION_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewButtonDisabled: {
    opacity: 0.62,
  },
  reviewButtonText: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  actionsBlock: {
    flexDirection: "row",
    gap: 14,
  },
  actionsCard: {
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 20,
    backgroundColor: colors.card,
    marginHorizontal: 0,
  },
  actionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  orderAgainButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: ORDER_ACTION_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  orderAgainButtonDisabled: {
    opacity: 0.72,
  },
  orderAgainText: {
    color: ORDER_ACTION_GREEN,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
  },
  helpButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  helpText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
  },
});
