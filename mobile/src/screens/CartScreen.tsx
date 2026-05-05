import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Trash2 } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { QuantityStepper } from "../components/QuantityStepper";
import { Screen } from "../components/Screen";
import { money } from "../lib/format";
import { CartStackParamList } from "../navigation/types";
import { useCartStore } from "../store/cartStore";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<CartStackParamList, "CartHome">;

export function CartScreen({ navigation }: Props) {
  const items = useCartStore((state) => state.items);
  const promoCode = useCartStore((state) => state.promoCode);
  const setPromoCode = useCartStore((state) => state.setPromoCode);
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const subtotal = useCartStore((state) => state.calculateSubtotal());
  const deliveryFee = useCartStore((state) => state.calculateDeliveryFee());
  const discount = useCartStore((state) => state.calculateDiscount());
  const total = useCartStore((state) => state.calculateTotal());

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Cos</Text>
        {!items.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Cosul este gol</Text>
            <Text style={styles.emptyText}>Alege un restaurant si adauga preparatele preferate.</Text>
          </View>
        ) : (
          <>
            <View style={styles.items}>
              {items.map((item) => (
                <View key={item.id} style={styles.item}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product.name}</Text>
                    {item.selectedOptions.map((option) => (
                      <Text key={option.id} style={styles.optionText}>
                        {option.name} +{money(option.extra_price)}
                      </Text>
                    ))}
                    <Text style={styles.itemPrice}>
                      {money(Number(item.product.effective_price ?? item.product.discount_price ?? item.product.price) * item.quantity)}
                    </Text>
                  </View>
                  <View style={styles.itemActions}>
                    <QuantityStepper
                      value={item.quantity}
                      onIncrease={() => increaseQuantity(item.id)}
                      onDecrease={() => decreaseQuantity(item.id)}
                    />
                    <Pressable onPress={() => removeItem(item.id)} style={styles.trashButton}>
                      <Trash2 size={18} stroke={colors.red} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            <TextInput
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="Cod promotional"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              style={styles.input}
            />

            <View style={styles.summary}>
              <SummaryRow label="Subtotal" value={money(subtotal)} />
              <SummaryRow label="Livrare" value={money(deliveryFee)} />
              <SummaryRow label="Reducere" value={`-${money(discount)}`} positive />
              <View style={styles.divider} />
              <SummaryRow label="Total" value={money(total)} total />
            </View>
          </>
        )}
      </ScrollView>
      {!!items.length && (
        <View style={styles.footer}>
          <PrimaryButton title="Continua comanda" onPress={() => navigation.navigate("Checkout")} />
        </View>
      )}
    </Screen>
  );
}

function SummaryRow({ label, value, total, positive }: { label: string; value: string; total?: boolean; positive?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, total && styles.totalLabel]}>{label}</Text>
      <Text style={[styles.summaryValue, positive && styles.positive, total && styles.totalValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 14,
    paddingBottom: 122,
    gap: 18,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
  },
  empty: {
    minHeight: 260,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 21,
  },
  items: {
    gap: 12,
  },
  item: {
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    gap: 10,
  },
  itemInfo: {
    flex: 1,
    gap: 5,
  },
  itemName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  optionText: {
    color: colors.muted,
    fontWeight: "700",
  },
  itemPrice: {
    color: colors.lime,
    fontWeight: "900",
  },
  itemActions: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  trashButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(231, 51, 63, 0.12)",
  },
  input: {
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 16,
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
  summary: {
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: colors.muted,
    fontWeight: "800",
  },
  summaryValue: {
    color: colors.text,
    fontWeight: "900",
  },
  positive: {
    color: colors.lime,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  totalLabel: {
    color: colors.text,
    fontSize: 18,
  },
  totalValue: {
    color: colors.lime,
    fontSize: 20,
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

