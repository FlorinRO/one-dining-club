import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertCircle, Check, ShoppingBag, X } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { QuantityStepper } from "../components/QuantityStepper";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { money } from "../lib/format";
import { FALLBACK_PRODUCT_IMAGE, resolveImageUri } from "../lib/images";
import { HomeStackParamList } from "../navigation/types";
import { useCartStore } from "../store/cartStore";
import { colors } from "../theme/colors";
import { ProductOption, ProductOptionGroup } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "ProductDetails">;


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
  return maxSelect > 1 ? tr(`Opțional · alege maxim ${maxSelect}`, `Optional · choose up to ${maxSelect}`) : tr("Opțional", "Optional");
};

export function ProductDetailsModal({ navigation, route }: Props) {
  const { tr } = useI18n();
  const { product, restaurant } = route.params;
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<ProductOption[]>([]);
  const [notes, setNotes] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={trackFloatingCartScrollDirection}
        scrollEventThrottle={16}
      >
        <View style={styles.hero}>
          <Image
            source={{ uri: resolveImageUri(product.image, FALLBACK_PRODUCT_IMAGE) }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
          <Pressable onPress={() => navigation.goBack()} style={styles.close}>
            <X size={22} stroke={colors.white} />
          </Pressable>
        </View>
        <View style={styles.titleRow}>
          <View style={styles.nameBadge}>
            <Text numberOfLines={1} style={styles.name}>{product.name}</Text>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.price}>{money(basePrice)}</Text>
          </View>
        </View>
        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={styles.description}>{product.description}</Text>
          </View>
          <View style={styles.sectionDivider} />

          {product.allergens && (
            <View style={styles.notice}>
              <AlertCircle size={17} stroke={colors.red} />
              <View style={styles.noticeTextWrap}>
                <Text style={styles.noticeTitle}>{tr("Alergeni", "Allergens")}</Text>
                <Text style={styles.noticeText}>{product.allergens}</Text>
              </View>
            </View>
          )}
          {product.allergens && <View style={styles.sectionDivider} />}

          {optionGroups.map((group) => (
            <View key={group.id} style={styles.optionGroup}>
              <View>
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
                    style={[styles.option, active && styles.optionActive, unavailable && styles.optionDisabled]}
                  >
                    <View style={[styles.optionCheck, active && styles.optionCheckActive]}>
                      {active && <Check size={14} stroke={colors.white} />}
                    </View>
                    <Text style={[styles.optionName, active && styles.optionNameActive, unavailable && styles.optionDisabledText]}>
                      {option.name}
                    </Text>
                    <Text style={[styles.optionPrice, active && styles.optionNameActive, unavailable && styles.optionDisabledText]}>
                      {optionPrice > 0 ? `+${money(option.extra_price)}` : tr("Inclus", "Included")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          {optionGroups.length > 0 && <View style={styles.sectionDivider} />}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr("Mențiuni", "Notes")}</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 120);
              }}
              placeholder={tr("Ex: fără ceapă, sos separat", "Ex: no onion, sauce on the side")}
              placeholderTextColor={colors.muted}
              multiline
              style={styles.notesInput}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {missingRequiredGroup && <Text style={styles.footerHint}>{tr("Alege", "Choose")} {missingRequiredGroup.name}</Text>}
        <View style={styles.footerRow}>
          <QuantityStepper
            value={quantity}
            onIncrease={() => setQuantity((value) => value + 1)}
            onDecrease={() => setQuantity((value) => Math.max(1, value - 1))}
          />
          <Pressable disabled={!canSubmit} onPress={submit} style={({ pressed }) => [styles.addButton, pressed && canSubmit && styles.addButtonPressed, !canSubmit && styles.addButtonDisabled]}>
            <ShoppingBag size={17} stroke={colors.red} />
            {isAvailable ? (
              <Text style={styles.addButtonText}>
                {tr("Adaugă", "Add")} · <Text style={styles.addButtonPrice}>{money(total)}</Text>
              </Text>
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
  close: {
    position: "absolute",
    top: 16,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
    zIndex: 3,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 22,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.red,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 10,
  },
  nameBadge: {
    minHeight: 36,
    flexShrink: 1,
    justifyContent: "center",
  },
  name: {
    color: colors.white,
    fontFamily: "Georgia",
    fontSize: 16,
    lineHeight: 20,
    fontStyle: "italic",
    fontWeight: "400",
  },
  priceBadge: {
    minHeight: 28,
    borderRadius: 6,
    borderWidth: 0,
    justifyContent: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  price: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "600",
  },
  section: {
    gap: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.6,
    marginVertical: -6,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
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
    gap: 10,
    paddingTop: 4,
  },
  groupTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  groupHint: {
    marginTop: 3,
    color: colors.muted,
    fontWeight: "500",
  },
  option: {
    minHeight: 50,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    fontWeight: "500",
  },
  optionNameActive: {
    color: colors.red,
  },
  optionDisabledText: {
    color: colors.muted,
  },
  optionPrice: {
    color: colors.muted,
    fontWeight: "500",
  },
  notesInput: {
    minHeight: 102,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
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
    minHeight: 46,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.red,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: colors.red,
    fontSize: 15,
    fontWeight: "500",
  },
  addButtonPrice: {
    color: colors.text,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 104,
    padding: 18,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
