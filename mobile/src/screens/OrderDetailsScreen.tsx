import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChevronRight, CreditCard } from "lucide-react-native";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrdersStackParamList } from "../navigation/types";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<OrdersStackParamList, "OrderDetails">;

export function OrderDetailsScreen({ route }: Props) {
  const { tr, language } = useI18n();
  const insets = useSafeAreaInsets();
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();
  const { order } = route.params;
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const serviceFee = Math.max(0, Math.round(subtotal * 0.02 * 100) / 100);
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const total = Number(order.total || 0);
  const orderCode = `#${`I${order.id.toString(36).toUpperCase()}`}`;
  const statusLabel = order.order_status === "delivered" ? tr("Livrată", "Delivered") : tr("În curs", "In progress");
  const formattedDate = new Intl.DateTimeFormat(language === "en" ? "en-US" : "ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(order.created_at));
  const primaryAddress = typeof order.address === "object" ? `${order.address.address_line_1}, ${order.address.city}` : tr("Adresă salvată", "Saved address");
  const extraAddressLines = typeof order.address === "object" ? [order.address.address_line_2, order.address.instructions].filter(Boolean) : [];
  const paymentLabel = order.payment_method === "cash" ? tr("Plată cash", "Cash payment") : tr("Plată online", "Online payment");

  return (
    <View style={styles.page}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={trackFloatingCartScrollDirection}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingBottom: 0 }]}
      >
        <View style={[styles.card, styles.topInfoCard]}>
          <Text style={styles.metaText}>
            {statusLabel} {formattedDate}
          </Text>
          <Text style={styles.orderCode}>{tr("Comanda", "Order")} {orderCode}</Text>

          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.quantity} x {item.product_name.toUpperCase()}
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
          <Text style={styles.sectionTitle}>{tr("Adresa de livrare", "Delivery address")}</Text>
          <Text style={styles.addressMain}>{primaryAddress}</Text>
          {extraAddressLines.map((line) => (
            <Text key={line} style={styles.addressMuted}>
              {line}
            </Text>
          ))}
          {!extraAddressLines.length ? <Text style={styles.addressMuted}>{tr("La apartamentul 10", "At apartment 10")}</Text> : null}
        </View>

        <Pressable style={styles.card} onPress={() => Alert.alert(tr("Meniu", "Menu"), tr(`Deschidem meniul pentru ${order.restaurant_name}.`, `Opening menu for ${order.restaurant_name}.`))}>
          <Text style={styles.sectionTitle}>{order.restaurant_name}</Text>
          <View style={styles.menuRow}>
            <Text style={styles.menuText}>{tr("Vezi meniul", "View menu")}</Text>
            <ChevronRight size={34} color={colors.muted} strokeWidth={1.8} />
          </View>
        </Pressable>

        <View style={[styles.actionsCard, { paddingBottom: 28 + insets.bottom, marginBottom: -(insets.bottom + 18) }]}>
          <View style={styles.actionsBlock}>
            <Pressable style={styles.orderAgainButton} onPress={() => Alert.alert(tr("Comandă din nou", "Order again"), tr("Funcția de reorder se poate conecta acum la coș.", "Reorder can now be connected to cart."))}>
              <Text style={styles.orderAgainText}>{tr("Comandă din nou", "Order again")}</Text>
            </Pressable>
            <Pressable style={styles.helpButton} onPress={() => Alert.alert(tr("Ajutor", "Help"), tr("Suportul pentru această comandă va fi conectat aici.", "Support for this order will be connected here."))}>
              <Text style={styles.helpText}>{tr("Ajutor", "Help")}</Text>
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
  content: {
    paddingTop: 0,
    paddingBottom: 28,
    gap: 8,
    backgroundColor: colors.background,
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
    marginTop: -2,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
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
  actionsBlock: {
    gap: 14,
  },
  actionsCard: {
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 20,
    backgroundColor: colors.card,
    marginHorizontal: 0,
  },
  orderAgainButton: {
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  orderAgainText: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  helpButton: {
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  helpText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
});
