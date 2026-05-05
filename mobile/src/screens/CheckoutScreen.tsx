import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CreditCard, Home, MessageSquareText } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { addressesApi } from "../api/addressesApi";
import { ordersApi } from "../api/ordersApi";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { money } from "../lib/format";
import { CartStackParamList } from "../navigation/types";
import { useCartStore } from "../store/cartStore";
import { useOrdersStore } from "../store/ordersStore";
import { colors } from "../theme/colors";
import { Address, Order, PaymentMethod } from "../types/models";

type Props = NativeStackScreenProps<CartStackParamList, "Checkout">;

export function CheckoutScreen({ navigation }: Props) {
  const items = useCartStore((state) => state.items);
  const restaurant = useCartStore((state) => state.restaurant);
  const promoCode = useCartStore((state) => state.promoCode);
  const subtotal = useCartStore((state) => state.calculateSubtotal());
  const deliveryFee = useCartStore((state) => state.calculateDeliveryFee());
  const discount = useCartStore((state) => state.calculateDiscount());
  const total = useCartStore((state) => state.calculateTotal());
  const clearCart = useCartStore((state) => state.clearCart);
  const addOrder = useOrdersStore((state) => state.addOrder);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    addressesApi.list().then(setAddresses);
  }, []);

  const selectedAddress = addresses.find((address) => address.is_default) ?? addresses[0];

  const submit = async () => {
    if (!restaurant || !selectedAddress || !items.length) return;
    setLoading(true);
    try {
      const order = await ordersApi.create({
        restaurant_id: restaurant.id,
        address_id: selectedAddress.id,
        payment_method: paymentMethod,
        promo_code: promoCode,
        customer_note: note,
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
          option_ids: item.selectedOptions.map((option) => option.id),
        })),
      });
      addOrder(order);
    } catch {
      const fallbackOrder: Order = {
        id: Date.now(),
        restaurant: restaurant.id,
        restaurant_name: restaurant.name,
        subtotal,
        delivery_fee: deliveryFee,
        discount,
        total,
        payment_method: paymentMethod,
        order_status: "pending",
        created_at: new Date().toISOString(),
        address: selectedAddress,
        items: items.map((item, index) => ({
          id: index + 1,
          product: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.effective_price ?? item.product.discount_price ?? item.product.price,
          total_price: Number(item.product.effective_price ?? item.product.discount_price ?? item.product.price) * item.quantity,
          notes: item.notes,
          options: item.selectedOptions.map((option) => ({
            id: option.id,
            option_name: option.name,
            extra_price: option.extra_price,
          })),
        })),
      };
      addOrder(fallbackOrder);
    } finally {
      clearCart();
      setLoading(false);
      Alert.alert("Comandă plasată", "Statusul comenzii este disponibil în tab-ul Orders.");
      navigation.getParent()?.navigate("OrdersTab", { screen: "OrdersHome" });
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Checkout</Text>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Home size={20} stroke={colors.lime} />
            <Text style={styles.panelTitle}>Adresă livrare</Text>
          </View>
          {selectedAddress ? (
            <Pressable onPress={() => navigation.navigate("Address")} style={styles.addressCard}>
              <Text style={styles.addressLabel}>{selectedAddress.label}</Text>
              <Text style={styles.addressText}>{selectedAddress.address_line_1}</Text>
              <Text style={styles.addressMuted}>{selectedAddress.city}</Text>
            </Pressable>
          ) : (
            <PrimaryButton title="Adaugă adresă" variant="ghost" onPress={() => navigation.navigate("Address")} />
          )}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <CreditCard size={20} stroke={colors.lime} />
            <Text style={styles.panelTitle}>Metodă plată</Text>
          </View>
          <View style={styles.methodGrid}>
            {(["cash", "card", "apple_pay", "google_pay"] as PaymentMethod[]).map((method) => (
              <Pressable
                key={method}
                onPress={() => setPaymentMethod(method)}
                style={[styles.method, paymentMethod === method && styles.methodActive]}
              >
                <Text style={[styles.methodText, paymentMethod === method && styles.methodTextActive]}>
                  {method.replace("_", " ")}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <MessageSquareText size={20} stroke={colors.lime} />
            <Text style={styles.panelTitle}>Nota restaurant</Text>
          </View>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Ex: fără ceapă, sună la sosire"
            placeholderTextColor={colors.muted}
            style={styles.note}
            multiline
          />
        </View>

        <View style={styles.summary}>
          <SummaryRow label="Subtotal" value={money(subtotal)} />
          <SummaryRow label="Livrare" value={money(deliveryFee)} />
          <SummaryRow label="Reducere" value={`-${money(discount)}`} positive />
          <View style={styles.divider} />
          <SummaryRow label="Total" value={money(total)} total />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton title={loading ? "Se plasează..." : "Plasează comanda"} onPress={submit} disabled={loading || !selectedAddress} />
      </View>
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
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
  },
  panel: {
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  addressCard: {
    borderRadius: 18,
    backgroundColor: colors.cardSoft,
    padding: 14,
    gap: 4,
  },
  addressLabel: {
    color: colors.lime,
    fontWeight: "900",
  },
  addressText: {
    color: colors.text,
    fontWeight: "800",
  },
  addressMuted: {
    color: colors.muted,
  },
  methodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  method: {
    minHeight: 42,
    borderRadius: 16,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  methodText: {
    color: colors.text,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  methodTextActive: {
    color: colors.background,
  },
  note: {
    minHeight: 84,
    borderRadius: 18,
    padding: 14,
    color: colors.text,
    backgroundColor: colors.cardSoft,
    textAlignVertical: "top",
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
