import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertCircle, Check, Info, ShoppingBag, Star, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { PrimaryButton } from "../components/PrimaryButton";
import { QuantityStepper } from "../components/QuantityStepper";
import { money } from "../lib/format";
import { FALLBACK_PRODUCT_IMAGE, resolveImageUri } from "../lib/images";
import { HomeStackParamList } from "../navigation/types";
import { useCartStore } from "../store/cartStore";
import { colors } from "../theme/colors";
import { ProductOption, ProductOptionGroup } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "ProductDetails">;

const PRODUCT_ZIG_ZAG_TOP_PATH =
  "M0 0 H280 V8 L272 0 L264 8 L256 0 L248 8 L240 0 L232 8 L224 0 L216 8 L208 0 L200 8 L192 0 L184 8 L176 0 L168 8 L160 0 L152 8 L144 0 L136 8 L128 0 L120 8 L112 0 L104 8 L96 0 L88 8 L80 0 L72 8 L64 0 L56 8 L48 0 L40 8 L32 0 L24 8 L16 0 L8 8 L0 0 Z";
const PRODUCT_ZIG_ZAG_BOTTOM_PATH =
  "M0 8 H280 V0 L272 8 L264 0 L256 8 L248 0 L240 8 L232 0 L224 8 L216 0 L208 8 L200 0 L192 8 L184 0 L176 8 L168 0 L160 8 L152 0 L144 8 L136 0 L128 8 L120 0 L112 8 L104 0 L96 8 L88 0 L80 8 L72 0 L64 8 L56 0 L48 8 L40 0 L32 8 L24 0 L16 8 L8 0 L0 8 Z";

const selectedCountForGroup = (selectedOptions: ProductOption[], group: ProductOptionGroup) => {
  const optionIds = new Set(group.options.map((option) => option.id));
  return selectedOptions.filter((option) => optionIds.has(option.id)).length;
};

const minimumRequiredForGroup = (group: ProductOptionGroup) =>
  Math.max(group.min_select, group.is_required ? 1 : 0);

const groupHint = (group: ProductOptionGroup) => {
  const minimumRequired = minimumRequiredForGroup(group);
  const maxSelect = Math.max(group.max_select || 1, 1);
  if (minimumRequired > 0 && maxSelect > minimumRequired) {
    return `Necesar · alege ${minimumRequired}-${maxSelect}`;
  }
  if (minimumRequired > 0) {
    return `Necesar · alege ${minimumRequired}`;
  }
  return maxSelect > 1 ? `Opțional · alege maxim ${maxSelect}` : "Opțional";
};

export function ProductDetailsModal({ navigation, route }: Props) {
  const { product, restaurant } = route.params;
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<ProductOption[]>([]);
  const [notes, setNotes] = useState("");
  const optionGroups = product.option_groups ?? [];
  const basePrice = product.effective_price ?? product.discount_price ?? product.price;

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

  const submit = () => {
    if (!canSubmit) return;
    addItem({ product, restaurant, quantity, selectedOptions, notes: notes.trim() || undefined });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Image
            source={{ uri: resolveImageUri(product.image, FALLBACK_PRODUCT_IMAGE) }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
          <ProductImageZigZagEdge position="top" />
          <ProductImageZigZagEdge position="bottom" />
          <Pressable onPress={() => navigation.goBack()} style={styles.close}>
            <X size={22} stroke={colors.white} />
          </Pressable>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.nameBadge}>
              <Text numberOfLines={2} style={styles.name}>{product.name}</Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.price}>{money(basePrice)}</Text>
            </View>
          </View>

          {(product.category_name || product.is_popular) && (
            <View style={styles.metaRow}>
              {product.category_name && (
                <View style={styles.metaItem}>
                  <Info size={15} stroke={colors.muted} />
                  <Text numberOfLines={1} style={styles.metaText}>{product.category_name}</Text>
                </View>
              )}
              {product.is_popular && (
                <View style={styles.metaItem}>
                  <Star size={15} stroke={colors.red} fill={colors.red} />
                  <Text style={styles.metaText}>Popular</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descriere</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {product.allergens && (
            <View style={styles.notice}>
              <AlertCircle size={17} stroke={colors.red} />
              <View style={styles.noticeTextWrap}>
                <Text style={styles.noticeTitle}>Alergeni</Text>
                <Text style={styles.noticeText}>{product.allergens}</Text>
              </View>
            </View>
          )}

          {optionGroups.map((group) => (
            <View key={group.id} style={styles.optionGroup}>
              <View>
                <Text style={styles.groupTitle}>{group.name}</Text>
                <Text style={styles.groupHint}>{groupHint(group)}</Text>
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
                    style={[styles.option, active && styles.optionActive, unavailable && styles.optionDisabled]}
                  >
                    <View style={[styles.optionCheck, active && styles.optionCheckActive]}>
                      {active && <Check size={14} stroke={colors.white} />}
                    </View>
                    <Text style={[styles.optionName, active && styles.optionNameActive, unavailable && styles.optionDisabledText]}>
                      {option.name}
                    </Text>
                    <Text style={[styles.optionPrice, active && styles.optionNameActive, unavailable && styles.optionDisabledText]}>
                      {optionPrice > 0 ? `+${money(option.extra_price)}` : "Inclus"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mențiuni</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ex: fără ceapă, sos separat"
              placeholderTextColor={colors.muted}
              multiline
              style={styles.notesInput}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {missingRequiredGroup && <Text style={styles.footerHint}>Alege {missingRequiredGroup.name}</Text>}
        <View style={styles.footerRow}>
          <QuantityStepper
            value={quantity}
            onIncrease={() => setQuantity((value) => value + 1)}
            onDecrease={() => setQuantity((value) => Math.max(1, value - 1))}
          />
          <PrimaryButton
            title={isAvailable ? `Adaugă · ${money(total)}` : "Indisponibil"}
            onPress={submit}
            disabled={!canSubmit}
            icon={<ShoppingBag size={18} stroke={colors.white} />}
            style={styles.addButton}
          />
        </View>
      </View>
    </View>
  );
}

type ProductImageZigZagEdgeProps = {
  position: "top" | "bottom";
};

function ProductImageZigZagEdge({ position }: ProductImageZigZagEdgeProps) {
  return (
    <Svg
      width="100%"
      height={8}
      viewBox="0 0 280 8"
      preserveAspectRatio="none"
      pointerEvents="none"
      style={[styles.zigZagEdge, position === "top" ? styles.zigZagTop : styles.zigZagBottom]}
    >
      <Path d={position === "top" ? PRODUCT_ZIG_ZAG_TOP_PATH : PRODUCT_ZIG_ZAG_BOTTOM_PATH} fill={colors.background} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 156,
  },
  hero: {
    height: 344,
    position: "relative",
    backgroundColor: colors.cardSoft,
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.cardSoft,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  zigZagEdge: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 2,
  },
  zigZagTop: {
    top: 0,
  },
  zigZagBottom: {
    bottom: 0,
  },
  close: {
    position: "absolute",
    top: 58,
    right: 18,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
    zIndex: 3,
  },
  body: {
    padding: 18,
    gap: 18,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "stretch",
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  nameBadge: {
    minHeight: 40,
    flexShrink: 1,
    justifyContent: "center",
    backgroundColor: colors.red,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  name: {
    color: colors.white,
    fontFamily: "Georgia",
    fontSize: 23,
    lineHeight: 28,
    fontStyle: "italic",
    fontWeight: "400",
  },
  priceBadge: {
    minHeight: 40,
    borderWidth: 2,
    borderRadius: 2,
    borderColor: colors.red,
    justifyContent: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  price: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaItem: {
    minHeight: 30,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
  },
  metaText: {
    flexShrink: 1,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.red,
    backgroundColor: colors.cardSoft,
    padding: 12,
  },
  noticeTextWrap: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  noticeText: {
    color: colors.muted,
    lineHeight: 20,
    fontWeight: "600",
  },
  optionGroup: {
    gap: 9,
    paddingTop: 2,
  },
  groupTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  groupHint: {
    marginTop: 3,
    color: colors.muted,
    fontWeight: "700",
  },
  option: {
    minHeight: 50,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionActive: {
    borderColor: colors.red,
    backgroundColor: colors.white,
  },
  optionDisabled: {
    opacity: 0.48,
  },
  optionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  optionCheckActive: {
    borderColor: colors.red,
    backgroundColor: colors.red,
  },
  optionName: {
    flex: 1,
    color: colors.text,
    fontWeight: "800",
  },
  optionNameActive: {
    color: colors.red,
  },
  optionDisabledText: {
    color: colors.muted,
  },
  optionPrice: {
    color: colors.muted,
    fontWeight: "800",
  },
  notesInput: {
    minHeight: 92,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    lineHeight: 21,
  },
  footerHint: {
    marginBottom: 8,
    color: colors.red,
    fontSize: 13,
    fontWeight: "800",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addButton: {
    flex: 1,
    borderRadius: 2,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
