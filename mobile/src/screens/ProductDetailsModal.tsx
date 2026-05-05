import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { QuantityStepper } from "../components/QuantityStepper";
import { money } from "../lib/format";
import { HomeStackParamList } from "../navigation/types";
import { useCartStore } from "../store/cartStore";
import { colors } from "../theme/colors";
import { ProductOption } from "../types/models";

type Props = NativeStackScreenProps<HomeStackParamList, "ProductDetails">;

export function ProductDetailsModal({ navigation, route }: Props) {
  const { product, restaurant } = route.params;
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<ProductOption[]>([]);

  const total = useMemo(() => {
    const base = Number(product.effective_price ?? product.discount_price ?? product.price);
    const extras = selectedOptions.reduce((sum, option) => sum + Number(option.extra_price), 0);
    return (base + extras) * quantity;
  }, [product, quantity, selectedOptions]);

  const toggleOption = (option: ProductOption, maxSelect: number) => {
    const exists = selectedOptions.some((item) => item.id === option.id);
    if (exists) {
      setSelectedOptions(selectedOptions.filter((item) => item.id !== option.id));
      return;
    }
    if (maxSelect === 1) {
      setSelectedOptions([option]);
      return;
    }
    setSelectedOptions([...selectedOptions, option]);
  };

  const submit = () => {
    addItem({ product, restaurant, quantity, selectedOptions });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View>
          <Image source={{ uri: product.image ?? undefined }} style={styles.image} />
          <Pressable onPress={() => navigation.goBack()} style={styles.close}>
            <X size={22} stroke={colors.text} />
          </Pressable>
        </View>
        <View style={styles.body}>
          <View>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
          <Text style={styles.price}>{money(product.effective_price ?? product.discount_price ?? product.price)}</Text>

          {product.option_groups?.map((group) => (
            <View key={group.id} style={styles.optionGroup}>
              <View>
                <Text style={styles.groupTitle}>{group.name}</Text>
                <Text style={styles.groupHint}>
                  {group.is_required ? "Necesar" : "Optional"} · alege maxim {group.max_select}
                </Text>
              </View>
              {group.options.map((option) => {
                const active = selectedOptions.some((item) => item.id === option.id);
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => toggleOption(option, group.max_select)}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <Text style={[styles.optionName, active && styles.optionNameActive]}>{option.name}</Text>
                    <Text style={[styles.optionPrice, active && styles.optionNameActive]}>
                      +{money(option.extra_price)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>Cantitate</Text>
            <QuantityStepper
              value={quantity}
              onIncrease={() => setQuantity((value) => value + 1)}
              onDecrease={() => setQuantity((value) => Math.max(1, value - 1))}
            />
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton title={`Adauga in cos · ${money(total)}`} onPress={submit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 124,
  },
  image: {
    width: "100%",
    height: 318,
    backgroundColor: colors.cardSoft,
  },
  close: {
    position: "absolute",
    top: 58,
    right: 18,
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  body: {
    padding: 18,
    gap: 20,
  },
  name: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
  },
  description: {
    marginTop: 8,
    color: colors.muted,
    lineHeight: 22,
  },
  price: {
    color: colors.lime,
    fontSize: 24,
    fontWeight: "900",
  },
  optionGroup: {
    gap: 10,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionActive: {
    borderColor: colors.lime,
    backgroundColor: "rgba(184, 242, 109, 0.13)",
  },
  optionName: {
    flex: 1,
    color: colors.text,
    fontWeight: "800",
  },
  optionNameActive: {
    color: colors.lime,
  },
  optionPrice: {
    color: colors.muted,
    fontWeight: "800",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quantityLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
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

