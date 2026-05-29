import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { AlertTriangle, ArrowLeft, Bike, ChevronRight, Clock3, CreditCard, MapPin, PlusCircle, ShoppingCart, Trash2, Wallet } from "lucide-react-native";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { addressesApi } from "../api/addressesApi";
import { getDemoProductVideoSource } from "../data/demoVideos";
import { ordersApi } from "../api/ordersApi";
import { QuantityStepper } from "../components/QuantityStepper";
import { Screen } from "../components/Screen";
import { useI18n } from "../i18n/useI18n";
import { money } from "../lib/format";
import { resolveProductImageUri } from "../lib/images";
import { CartStackParamList } from "../navigation/types";
import { useCartStore } from "../store/cartStore";
import { useOrdersStore } from "../store/ordersStore";
import { colors } from "../theme/colors";
import {
  BURGER_BACKGROUND_IMAGE,
  FOOD_BACKGROUND_BLUR_RADIUS,
  FOOD_BACKGROUND_GRADIENT_COLORS,
  FOOD_BACKGROUND_GRADIENT_LOCATIONS,
  FOOD_BACKGROUND_IMAGE_OPACITY,
  FOOD_BACKGROUND_IMAGE_SCALE,
} from "../theme/foodBackground";
import { Address, PaymentMethod, Product, Restaurant } from "../types/models";

type Props = NativeStackScreenProps<CartStackParamList, "CartHome">;

const tipOptions = [0, 3, 5, 10];

function CartItemMedia({
  videoUrl,
  imageUrl,
  restaurant,
  product,
}: {
  videoUrl?: string | null;
  imageUrl: string;
  restaurant: Restaurant;
  product: Product;
}) {
  const videoSource = useMemo(
    () =>
      videoUrl
        ? {
            uri: videoUrl,
            contentType: "progressive" as const,
            useCaching: true,
          }
        : getDemoProductVideoSource({ restaurant, product, fallbackIndex: product.id }),
    [product, restaurant, videoUrl],
  );
  const [showImageFallback, setShowImageFallback] = useState(false);
  const player = useVideoPlayer(
    videoSource,
    (videoPlayer) => {
      videoPlayer.loop = true;
      videoPlayer.muted = true;
      videoPlayer.volume = 0;
      videoPlayer.audioMixingMode = "mixWithOthers";
    },
  );

  useEffect(() => {
    setShowImageFallback(false);
    try {
      player.play();
    } catch {
      setShowImageFallback(true);
    }

    return () => {
      try {
        player.pause();
      } catch {
        // Ignore cleanup failures from native video state.
      }
    };
  }, [player, videoSource]);

  if (showImageFallback) {
    return <Image source={{ uri: imageUrl }} resizeMode="cover" style={styles.itemImage} />;
  }

  return (
    <VideoView
      player={player}
      style={styles.itemImage}
      contentFit="cover"
      nativeControls={false}
      fullscreenOptions={{ enable: false }}
      allowsPictureInPicture={false}
      playsInline
      surfaceType="textureView"
      useExoShutter={false}
    />
  );
}

export function CartScreen({ navigation }: Props) {
  const { tr } = useI18n();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const items = useCartStore((state) => state.items);
  const restaurant = useCartStore((state) => state.restaurant);
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const subtotal = useCartStore((state) => state.calculateSubtotal());
  const deliveryFee = useCartStore((state) => state.calculateDeliveryFee());
  const discount = useCartStore((state) => state.calculateDiscount());
  const addOrder = useOrdersStore((state) => state.addOrder);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [dropoffType, setDropoffType] = useState<"meet" | "leave" | "outside">("meet");
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">("delivery");
  const [tip, setTip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSlidingConfirm, setIsSlidingConfirm] = useState(false);
  const [isCourierNoteFocused, setIsCourierNoteFocused] = useState(false);
  const courierNoteInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    addressesApi.list().then(setAddresses).catch(() => setAddresses([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      addressesApi.list().then(setAddresses).catch(() => setAddresses([]));
    }, []),
  );

  const selectedAddress = addresses.find((address) => address.is_default) ?? addresses[0];
  const serviceFee = useMemo(() => Math.round(subtotal * 0.02 * 100) / 100, [subtotal]);
  const minimumOrder = Number(restaurant?.minimum_order ?? 0);
  const smallOrderFee = useMemo(() => {
    if (!subtotal || subtotal >= minimumOrder) return 0;
    return Math.max(0.75, Number(((minimumOrder - subtotal) * 0.08).toFixed(2)));
  }, [minimumOrder, subtotal]);
  const deliveryCost = fulfillmentType === "pickup" ? 0 : deliveryFee;
  const total = useMemo(
    () => Math.max(0, subtotal - discount + deliveryCost + serviceFee + smallOrderFee + tip),
    [deliveryCost, discount, serviceFee, smallOrderFee, subtotal, tip],
  );

  const clearAll = () => {
    Alert.alert(tr("Golești coșul?", "Clear cart?"), tr("Toate produsele vor fi șterse.", "All items will be removed."), [
      { text: tr("Anulează", "Cancel"), style: "cancel" },
      { text: tr("Șterge", "Delete"), style: "destructive", onPress: clearCart },
    ]);
  };

  const openRestaurantMenu = () => {
    if (!restaurant) return;
    const parentNav = navigation.getParent();
    const grandParentNav = parentNav?.getParent();
    const parentNavAny = parentNav as any;
    const grandParentNavAny = grandParentNav as any;
    const parentRoutes = parentNav?.getState()?.routeNames ?? [];
    const grandParentRoutes = grandParentNav?.getState()?.routeNames ?? [];

    if (parentRoutes.includes("RestaurantDetails")) {
      parentNavAny?.navigate("RestaurantDetails", { restaurant });
      return;
    }

    if (grandParentRoutes.includes("HomeTab")) {
      grandParentNavAny?.navigate("HomeTab", { screen: "RestaurantDetails", params: { restaurant } });
    }
  };

  const openDeliveryAddressChooser = () => {
    const parentNav = navigation.getParent();
    const grandParentNav = parentNav?.getParent();
    const parentNavAny = parentNav as any;
    const grandParentNavAny = grandParentNav as any;
    const parentRoutes = parentNav?.getState()?.routeNames ?? [];
    const grandParentRoutes = grandParentNav?.getState()?.routeNames ?? [];

    if (parentRoutes.includes("DeliveryAddress")) {
      parentNavAny?.navigate("DeliveryAddress");
      return;
    }

    if (grandParentRoutes.includes("HomeTab")) {
      grandParentNavAny?.navigate("HomeTab", { screen: "DeliveryAddress" });
    }
  };

  const submit = async () => {
    if (!restaurant || !selectedAddress || !items.length) {
      if (!selectedAddress) openDeliveryAddressChooser();
      return;
    }

    setLoading(true);
    try {
      const order = await ordersApi.create({
        restaurant_id: restaurant.id,
        address_id: selectedAddress.id,
        payment_method: paymentMethod,
        customer_note: [
          note,
          dropoffType === "leave"
            ? tr("Predare: lasă la ușă", "Dropoff: leave at door")
            : dropoffType === "outside"
              ? tr("Predare: întâlnește-mă afară", "Dropoff: meet outside")
              : tr("Predare: la ușă", "Dropoff: meet at door"),
          tip ? tr(`Tips: ${money(tip)}`, `Tip: ${money(tip)}`) : "",
        ]
          .filter(Boolean)
          .join(" • "),
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
          option_ids: item.selectedOptions.map((option) => option.id),
        })),
      });
      addOrder(order);
      clearCart();
      Alert.alert(tr("Comandă plasată", "Order placed"), tr("Statusul comenzii este disponibil în tabul Orders.", "Order status is available in the Orders tab."));
      navigation.getParent()?.navigate("OrdersTab", { screen: "OrdersHome" });
    } catch {
      Alert.alert(tr("Comanda nu a fost plasată", "Order was not placed"), tr("Verifică adresa, restaurantul și conexiunea cu backend-ul, apoi încearcă din nou.", "Check address, restaurant, and backend connection, then try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false} edges={["left", "right"]}>
      <View style={styles.screen}>
        <Image source={BURGER_BACKGROUND_IMAGE} style={styles.backgroundImage} resizeMode="cover" blurRadius={FOOD_BACKGROUND_BLUR_RADIUS} />
        <LinearGradient
          pointerEvents="none"
          colors={FOOD_BACKGROUND_GRADIENT_COLORS}
          locations={FOOD_BACKGROUND_GRADIENT_LOCATIONS}
          style={StyleSheet.absoluteFillObject}
        />
        <KeyboardAvoidingView
          style={[styles.contentLayer, { paddingTop: insets.top }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={styles.topHeader}>
            <Pressable onPress={() => navigation.canGoBack() && navigation.goBack()} style={styles.headerButton}>
              <ArrowLeft size={22} stroke={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>{restaurant?.name ?? tr("Coș", "Cart")}</Text>
            <Pressable onPress={clearAll} style={styles.headerButton}>
              <Trash2 size={21} stroke={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            scrollEnabled={!isSlidingConfirm}
            keyboardShouldPersistTaps="handled"
          >
            {!items.length ? (
              <View style={styles.empty}>
                <View style={styles.emptyIconWrap}>
                  <ShoppingCart size={34} stroke={colors.text} />
                </View>
                <Text style={styles.emptyTitle}>{tr("Coșul este gol", "Cart is empty")}</Text>
                <Text style={styles.emptyText}>{tr("Alege un restaurant și adaugă preparatele preferate.", "Pick a restaurant and add your favorite dishes.")}</Text>
              </View>
            ) : (
              <>
                <View style={[styles.card, styles.firstCard]}>
                  {items.map((item, index) => (
                    <View key={item.id} style={[styles.item, index !== items.length - 1 && styles.itemDivider]}>
                      <CartItemMedia
                        videoUrl={item.mediaVideoUrl ?? item.product.video_url}
                        imageUrl={resolveProductImageUri(item.product.image, item.product.id)}
                        restaurant={item.restaurant}
                        product={item.product}
                      />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.product.name}</Text>
                        {item.selectedOptions.map((option) => (
                          <Text key={option.id} style={styles.optionText}>
                            {option.name} +{money(option.extra_price)}
                          </Text>
                        ))}
                        {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
                        <Text style={styles.itemPrice}>{money(Number(item.product.effective_price ?? item.product.discount_price ?? item.product.price) * item.quantity)}</Text>
                      </View>
                      <View style={styles.itemActions}>
                        <QuantityStepper value={item.quantity} onIncrease={() => increaseQuantity(item.id)} onDecrease={() => decreaseQuantity(item.id)} />
                      </View>
                    </View>
                  ))}
                </View>

                <Pressable style={styles.addMoreRow} onPress={openRestaurantMenu}>
                  <PlusCircle size={24} stroke={colors.green} />
                  <Text style={styles.addMoreText}>{tr("Adaugă produse", "Add more")}</Text>
                </Pressable>

                <View style={styles.card}>
                  <OptionRow
                    icon={<Bike size={20} stroke={colors.text} />}
                    label={tr("Livrare", "Delivery")}
                    description={`${restaurant?.estimated_delivery_time_min ?? 25}-${restaurant?.estimated_delivery_time_max ?? 40} min`}
                    value={money(deliveryFee)}
                    selected={fulfillmentType === "delivery"}
                    onPress={() => setFulfillmentType("delivery")}
                  />
                  <View style={styles.rowDivider} />
                  <OptionRow
                    icon={<Clock3 size={20} stroke={colors.text} />}
                    label={tr("Pickup", "Pickup")}
                    description={tr("15-20 min", "15-20 min")}
                    value={money(0)}
                    selected={fulfillmentType === "pickup"}
                    onPress={() => setFulfillmentType("pickup")}
                  />
                </View>

                <View style={styles.card}>
                  <Pressable style={styles.addressRow} onPress={openDeliveryAddressChooser}>
                    <View style={styles.addressLeft}>
                      <MapPin size={22} stroke={colors.text} />
                      <Text numberOfLines={1} style={styles.addressText}>
                        {selectedAddress ? `${selectedAddress.address_line_1}, ${selectedAddress.city}` : tr("Adaugă adresa de livrare", "Add delivery address")}
                      </Text>
                    </View>
                    <ChevronRight size={22} stroke={colors.muted} />
                  </Pressable>
                  <View style={styles.warningBox}>
                    <AlertTriangle size={20} stroke={colors.redDark} />
                    <Text style={styles.warningText}>{tr("Verifică adresa înainte de a plasa comanda.", "Check your address before placing the order.")}</Text>
                  </View>
                  <Text style={styles.inputPersistentLabel}>{tr("Instrucțiuni pentru curier", "Instructions for courier")}</Text>
                  <TextInput
                    ref={courierNoteInputRef}
                    value={note}
                    onChangeText={setNote}
                placeholder={tr("Ex: interfon 12, etaj 3", "Ex: intercom 12, floor 3")}
                placeholderTextColor={colors.muted}
                style={[styles.input, isCourierNoteFocused && styles.inputFocused]}
                multiline={false}
                returnKeyType="done"
                blurOnSubmit
                    onFocus={() => {
                      setIsCourierNoteFocused(true);
                      setTimeout(() => scrollRef.current?.scrollTo({ y: 520, animated: true }), 120);
                    }}
                    onBlur={() => setIsCourierNoteFocused(false)}
                    onSubmitEditing={() => courierNoteInputRef.current?.blur()}
                  />
                </View>

                <View style={[styles.card, styles.airySection]}>
                  <Text style={styles.sectionTitle}>{tr("Instrucțiuni predare", "Dropoff instructions")}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                    <Pill label={tr("La ușă", "Meet at my door")} active={dropoffType === "meet"} onPress={() => setDropoffType("meet")} />
                    <Pill label={tr("Lasă la ușă", "Leave at my door")} active={dropoffType === "leave"} onPress={() => setDropoffType("leave")} />
                    <Pill label={tr("Afară", "Meet outside")} active={dropoffType === "outside"} onPress={() => setDropoffType("outside")} />
                  </ScrollView>
                </View>

                {fulfillmentType === "delivery" ? (
                  <View style={[styles.card, styles.airySection]}>
                    <Text style={styles.sectionTitle}>{tr("Tip curier", "Tip the courier?")}</Text>
                    <Text style={styles.sectionMuted}>{tr("Curierul primește 100% din bacșiș.", "The courier receives 100% of your tip.")}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                      {tipOptions.map((amount) => (
                        <Pill key={amount} label={amount === 0 ? tr("Fără tip", "No tip") : money(amount)} active={tip === amount} onPress={() => setTip(amount)} />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                <View style={[styles.card, styles.airySection]}>
                  <SummaryRow label={tr("Total produse", "Item total")} value={money(subtotal)} />
                  <SummaryRow label={tr("Reducere", "Discount")} value={`-${money(discount)}`} />
                  <SummaryRow label={tr("Subtotal", "Subtotal")} value={money(Math.max(0, subtotal - discount))} strong />
                  <SummaryRow label={tr("Taxă comandă mică", "Small order fee")} value={money(smallOrderFee)} />
                  <SummaryRow label={tr("Taxă servicii", "Service fee")} value={money(serviceFee)} />
                  <SummaryRow label={tr("Tips", "Tips")} value={money(tip)} />
                  <SummaryRow label={tr("Taxă livrare", "Delivery fee")} value={money(deliveryCost)} />
                  <View style={styles.divider} />
                  <SummaryRow label="Total" value={money(total)} total />

                  <View style={styles.paymentRow}>
                    <View style={styles.paymentLeft}>
                      <CreditCard size={20} stroke={colors.text} />
                      <Text style={styles.paymentText}>{paymentLabel(paymentMethod, tr)}</Text>
                    </View>
                    <Text style={styles.paymentValue}>{money(total)}</Text>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodGrid}>
                    {(["cash", "card", "apple_pay", "google_pay"] as PaymentMethod[]).map((method) => (
                      <PaymentMethodPill key={method} method={method} active={paymentMethod === method} onPress={() => setPaymentMethod(method)} tr={tr} />
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.footerInline}>
                  <SwipeToConfirm
                    label={loading ? tr("Se plasează...", "Placing...") : tr("Plasează comanda", "Place order")}
                    hint={tr("Derulează la dreapta pentru confirmare", "Slide right to confirm")}
                    disabled={loading || !selectedAddress}
                    isDarkMode={isDarkMode}
                    onSlidingChange={setIsSlidingConfirm}
                    onConfirm={submit}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

function paymentLabel(method: PaymentMethod, tr: (ro: string, en: string) => string) {
  if (method === "cash") return tr("Cash", "Cash");
  if (method === "card") return tr("Card", "Card");
  if (method === "apple_pay") return "Apple Pay";
  return "Google Pay";
}

function OptionRow({ icon, label, description, value, selected, onPress }: { icon: ReactNode; label: string; description: string; value: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.optionRow, selected && styles.optionRowSelected, pressed && styles.optionRowPressed]} onPress={onPress}>
      <View style={styles.optionLeft}>
        {icon}
        <View>
          <Text style={styles.optionLabel}>{label}</Text>
          <Text style={styles.optionDescription}>{description}</Text>
        </View>
      </View>
      <View style={styles.optionRight}>
        <Text style={styles.optionValue}>{value}</Text>
        <View style={[styles.radio, selected && styles.radioActive]}>{selected ? <View style={styles.radioInner} /> : null}</View>
      </View>
    </Pressable>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.pill, active && styles.pillActive]} onPress={onPress}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PaymentMethodPill({
  method,
  active,
  onPress,
  tr,
}: {
  method: PaymentMethod;
  active: boolean;
  onPress: () => void;
  tr: (ro: string, en: string) => string;
}) {
  const isCash = method === "cash";
  const isCard = method === "card";
  const isApple = method === "apple_pay";
  const isGoogle = method === "google_pay";

  return (
    <Pressable style={[styles.pill, styles.paymentPill, active && styles.pillActive]} onPress={onPress}>
      {isCash ? <Wallet size={16} stroke={colors.green} /> : null}
      {isCard ? <CreditCard size={16} stroke={colors.green} /> : null}
      {isApple ? <Text style={styles.applePayLogo}> Pay</Text> : null}
      {isGoogle ? <Text style={styles.googleIcon}>G</Text> : null}
      {isGoogle ? <Text style={[styles.pillText, styles.googlePayText, active && styles.pillTextActive]}>Pay</Text> : null}
      {(isCash || isCard) && <Text style={[styles.pillText, active && styles.pillTextActive]}>{paymentLabel(method, tr)}</Text>}
    </Pressable>
  );
}

function SummaryRow({ label, value, strong, total }: { label: string; value: string; strong?: boolean; total?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong && styles.summaryStrong, total && styles.summaryTotal]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong, total && styles.summaryTotal]}>{value}</Text>
    </View>
  );
}

function SwipeToConfirm({
  label,
  hint,
  disabled,
  isDarkMode,
  onSlidingChange,
  onConfirm,
}: {
  label: string;
  hint: string;
  disabled?: boolean;
  isDarkMode?: boolean;
  onSlidingChange?: (isSliding: boolean) => void;
  onConfirm: () => void;
}) {
  const KNOB_SIZE = 50;
  const THRESHOLD = 0.8;
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const maxX = Math.max(0, trackWidth - KNOB_SIZE - 8);

  useEffect(() => {
    if (disabled) translateX.setValue(0);
  }, [disabled, translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_, gesture) => !disabled && Math.abs(gesture.dx) > 2,
        onPanResponderGrant: () => {
          onSlidingChange?.(true);
        },
        onPanResponderMove: (_, gesture) => {
          if (disabled || !maxX) return;
          const next = Math.min(Math.max(0, gesture.dx), maxX);
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          onSlidingChange?.(false);
          if (disabled || !maxX) return;
          const next = Math.min(Math.max(0, gesture.dx), maxX);
          const reached = next >= maxX * THRESHOLD;
          if (reached) {
            Animated.timing(translateX, { toValue: maxX, duration: 170, useNativeDriver: true }).start(() => {
              onConfirm();
              Animated.timing(translateX, { toValue: 0, duration: 170, useNativeDriver: true }).start();
            });
            return;
          }
          Animated.timing(translateX, { toValue: 0, duration: 170, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => {
          onSlidingChange?.(false);
          Animated.timing(translateX, { toValue: 0, duration: 170, useNativeDriver: true }).start();
        },
      }),
    [disabled, maxX, onConfirm, onSlidingChange, translateX],
  );

  return (
    <View style={styles.slideWrap}>
      <View
        style={[styles.slideTrack, isDarkMode && styles.slideTrackDark, disabled && styles.slideTrackDisabled]}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      >
        <Text style={[styles.slideLabel, disabled && styles.slideLabelDisabled]}>{label}</Text>
        <Animated.View style={[styles.slideKnob, isDarkMode && styles.slideKnobDark, disabled && styles.slideKnobDisabled, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
          <ChevronRight size={20} stroke="#000000" />
        </Animated.View>
      </View>
      <Text style={[styles.slideHint, isDarkMode && styles.slideHintDark]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: FOOD_BACKGROUND_IMAGE_OPACITY,
    transform: [{ scale: FOOD_BACKGROUND_IMAGE_SCALE }],
  },
  contentLayer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 24,
    backgroundColor: "transparent",
  },
  topHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "transparent",
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  empty: {
    minHeight: 260,
    borderRadius: 26,
    padding: 22,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 21,
    textAlign: "center",
  },
  card: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 18,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    gap: 14,
  },
  firstCard: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  airySection: {
    marginTop: 2,
    paddingBottom: 10,
  },
  item: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemImage: {
    width: 78,
    height: 78,
    borderRadius: 16,
    backgroundColor: colors.cardSoft,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  optionText: {
    color: colors.muted,
    fontSize: 13,
  },
  itemNotes: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  itemPrice: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
    marginTop: 4,
  },
  itemActions: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  addMoreRow: {
    minHeight: 60,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addMoreText: {
    color: colors.greenDark,
    fontSize: 16,
    fontWeight: "500",
  },
  optionRow: {
    minHeight: 80,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionRowSelected: {
    backgroundColor: colors.successSoft,
  },
  optionRowPressed: {
    opacity: 0.9,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  optionLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  optionDescription: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 14,
  },
  optionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: colors.green,
    backgroundColor: colors.white,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  addressRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  addressLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  addressText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  warningBox: {
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: colors.dangerSoft,
    marginBottom: 20,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  warningText: {
    flex: 1,
    color: colors.redDark,
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: colors.text,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: "transparent",
    fontSize: 14,
  },
  inputFocused: {
    borderColor: colors.green,
    shadowColor: colors.green,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  inputPersistentLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 0,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  sectionMuted: {
    color: colors.muted,
    fontSize: 14,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 6,
  },
  pill: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.cardSoft,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.green,
  },
  pillText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  pillTextActive: {
    color: colors.text,
  },
  paymentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  googleIcon: {
    color: "#4285F4",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 17,
  },
  googlePayText: {
    color: colors.text,
  },
  applePayLogo: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  summaryValue: {
    color: colors.text,
    fontWeight: "500",
    fontSize: 14,
  },
  summaryStrong: {
    fontWeight: "700",
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  paymentRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paymentText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  paymentValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  methodGrid: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
    paddingRight: 6,
  },
  footerInline: {
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "transparent",
  },
  slideWrap: {
    gap: 8,
  },
  slideTrack: {
    height: 58,
    borderRadius: 14,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.green,
    justifyContent: "center",
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  slideTrackDark: {
    backgroundColor: "transparent",
  },
  slideTrackDisabled: {
    opacity: 0.5,
  },
  slideLabel: {
    color: colors.green,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
  },
  slideLabelDisabled: {
    color: colors.green,
  },
  slideKnob: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  slideKnobDark: {
    backgroundColor: colors.green,
  },
  slideKnobDisabled: {
    backgroundColor: colors.muted,
  },
  slideHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  slideHintDark: {
    color: "#C8C8C8",
  },
});
