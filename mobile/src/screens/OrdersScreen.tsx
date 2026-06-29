import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { ListOrdered, Play, RefreshCcw } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FoodBackground } from "../components/FoodBackground";
import { ordersApi } from "../api/ordersApi";
import { productsApi } from "../api/productsApi";
import { Screen } from "../components/Screen";
import { useFloatingCartScrollDirection } from "../hooks/useFloatingCartScrollDirection";
import { useI18n } from "../i18n/useI18n";
import { formatDateTime } from "../lib/dateFormat";
import { resolveImageUri } from "../lib/images";
import { OrdersStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { useOrdersStore } from "../store/ordersStore";
import { colors } from "../theme/colors";
import { Order, OrderStatus, Product } from "../types/models";

type Props = NativeStackScreenProps<OrdersStackParamList, "OrdersHome">;

type SafeOrder = Order & {
  id: number;
  restaurant_name: string;
  created_at: string;
  total: number;
  order_status: OrderStatus;
};

type OrderRow = {
  order: SafeOrder;
  product?: Product;
  productLine: string;
  imageUri?: string;
  videoUri?: string;
};

export function OrdersScreen({ navigation }: Props) {
  const { tr, language } = useI18n();
  const insets = useSafeAreaInsets();
  const topOverlayHeight = insets.top + 1;
  const trackFloatingCartScrollDirection = useFloatingCartScrollDirection();

  const storeOrders = useOrdersStore((state) => state.orders);
  const setOrders = useOrdersStore((state) => state.setOrders);
  const accessToken = useAuthStore((state) => state.accessToken);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const safeOrders = useMemo(() => sanitizeOrders(storeOrders), [storeOrders]);
  const orderRows = useMemo(() => buildOrderRows(safeOrders, products), [products, safeOrders]);
  const isInitialLoading = loading && !hasLoadedOnce && orderRows.length === 0;

  const loadOrders = useCallback(
    async (mode: "initial" | "refresh", shouldCommit: () => boolean) => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage(null);

      try {
        if (!accessToken) {
          setOrders([]);
          setProducts([]);
          setHasLoadedOnce(true);
          return;
        }

        const [ordersResult, productsResult] = await Promise.allSettled([
          ordersApi.list(),
          productsApi.list(),
        ]);
        if (!shouldCommit()) return;

        if (ordersResult.status === "fulfilled") {
          setOrders(sanitizeOrders(ordersResult.value));
        } else {
          setErrorMessage(tr("Nu am putut încărca comenzile. Încearcă din nou.", "Could not load your orders. Please try again."));
        }

        if (productsResult.status === "fulfilled") {
          setProducts(productsResult.value);
        } else {
          setProducts([]);
        }
        setHasLoadedOnce(true);
      } catch {
        if (!shouldCommit()) return;
        setErrorMessage(tr("Nu am putut încărca comenzile. Încearcă din nou.", "Could not load your orders. Please try again."));
        setHasLoadedOnce(true);
      } finally {
        if (!shouldCommit()) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, setOrders, tr],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadOrders("initial", () => active);

      return () => {
        active = false;
      };
    }, [loadOrders]),
  );

  return (
    <Screen padded={false} edges={["left", "right"]}>
      <View style={styles.page}>
        <FoodBackground />
        {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

        <FlatList
          data={orderRows}
          keyExtractor={(item) => String(item.order.id)}
          showsVerticalScrollIndicator={false}
          onScroll={trackFloatingCartScrollDirection}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={() => loadOrders("refresh", () => true)} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: topOverlayHeight + 12, paddingBottom: Math.max(insets.bottom, 16) + 90 },
            orderRows.length === 0 ? styles.emptyListContent : null,
          ]}
          ListHeaderComponent={
            orderRows.length > 0 ? (
              <View style={styles.titleBlock}>
                <Text style={styles.title}>{tr("Comenzile mele", "My Orders")}</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <OrderListRow
              order={item.order}
              productLine={item.productLine}
              imageUri={item.imageUri}
              videoUri={item.videoUri}
              language={language}
              tr={tr}
              onPress={() => navigation.navigate("OrderDetails", { order: item.order })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              {isInitialLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <View style={styles.emptyIconWrap}>
                  <ListOrdered size={24} color={colors.green} strokeWidth={2.2} />
                </View>
              )}
              <Text style={styles.emptyTitle}>{isInitialLoading ? tr("Încărcăm comenzile...", "Loading orders...") : tr("Nu ai comenzi încă", "No orders yet")}</Text>
              <Text style={styles.emptySubtitle}>
                {isInitialLoading
                  ? tr("Așteaptă câteva secunde.", "Please wait a few seconds.")
                  : tr("După prima comandă, istoricul va apărea aici.", "After your first order, your history will appear here.")}
              </Text>
              {!isInitialLoading ? (
                <Pressable style={styles.retryButton} onPress={() => loadOrders("refresh", () => true)}>
                  <RefreshCcw size={16} color={colors.white} strokeWidth={2.3} />
                  <Text style={styles.retryButtonText}>{tr("Reîncearcă", "Retry")}</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      </View>
    </Screen>
  );
}

function sanitizeOrders(input: unknown): SafeOrder[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const maybeOrder = item as Partial<Order>;

      const id = typeof maybeOrder.id === "number" ? maybeOrder.id : index + 1;
      const restaurantName = typeof maybeOrder.restaurant_name === "string" && maybeOrder.restaurant_name.trim() ? maybeOrder.restaurant_name.trim() : "YUMZY";
      const createdAt = typeof maybeOrder.created_at === "string" && maybeOrder.created_at ? maybeOrder.created_at : new Date().toISOString();
      const total = toNumber(maybeOrder.total);
      const orderStatus = normalizeStatus(maybeOrder.order_status);

      return {
        ...(maybeOrder as Order),
        id,
        restaurant_name: restaurantName,
        created_at: createdAt,
        total,
        order_status: orderStatus,
      } as SafeOrder;
    })
    .filter((order): order is SafeOrder => Boolean(order))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(status: unknown): OrderStatus {
  const knownStatuses: OrderStatus[] = ["pending", "accepted", "preparing", "ready_for_pickup", "picked_up", "on_the_way", "delivered", "cancelled", "rejected"];
  return knownStatuses.includes(status as OrderStatus) ? (status as OrderStatus) : "pending";
}

function money(value: number) {
  return `${value.toFixed(2).replace(".", ",")} lei`;
}

function buildOrderRows(orders: SafeOrder[], products: Product[]): OrderRow[] {
  const productsById = new Map(
    products
      .filter((product) => product && typeof product.id === "number")
      .map((product) => [product.id, product]),
  );

  return orders.map((order) => {
    const leadItem = getOrderItems(order)[0];
    const product = findProductForOrderItem(order, leadItem, productsById);
    const imageUri = resolveOrderMediaUri(leadItem?.product_image) ?? resolveOrderMediaUri(product?.image);
    const videoUri = resolveOrderMediaUri(leadItem?.product_video_url) ?? resolveOrderMediaUri(product?.video_url);

    return {
      order,
      product,
      imageUri,
      videoUri,
      productLine: orderProductLine(order, product),
    };
  });
}

function getOrderItems(order: SafeOrder) {
  return Array.isArray(order.items) ? order.items : [];
}

function toProductId(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function findProductForOrderItem(
  order: SafeOrder,
  item: SafeOrder["items"][number] | undefined,
  productsById: Map<number, Product>,
) {
  const productId = toProductId(item?.product);
  if (!productId) return undefined;

  const product = productsById.get(productId);
  if (!product) return undefined;

  return Number(product.restaurant) === Number(order.restaurant) ? product : undefined;
}

function resolveOrderMediaUri(uri: string | null | undefined) {
  const resolvedUri = resolveImageUri(uri, "");
  return resolvedUri || undefined;
}

function orderProductLine(order: SafeOrder, product?: Product) {
  const items = getOrderItems(order);
  if (!items.length) return "";
  const firstName = items[0]?.product_name?.trim() || product?.name.trim() || "";
  if (!firstName) return "";
  if (items.length === 1) return firstName;
  return `${firstName} +${items.length - 1}`;
}

function OrderListRow({
  order,
  productLine,
  imageUri,
  videoUri,
  language,
  tr,
  onPress,
}: {
  order: SafeOrder;
  productLine: string;
  imageUri?: string;
  videoUri?: string;
  language: string;
  tr: (ro: string, en: string) => string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <OrderRowMedia imageUri={imageUri} videoUri={videoUri} />

      <View style={styles.rowCopy}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {order.restaurant_name}
        </Text>
        <Text style={styles.totalValue}>{money(order.total)}</Text>
        <Text style={styles.metaText} numberOfLines={1}>
          {formatDateTime(order.created_at, language === "en" ? "en-US" : "ro-RO", "-")} • {statusLabel(order.order_status, tr)}
        </Text>
        {productLine ? (
          <Text style={styles.productLine} numberOfLines={1}>
            {productLine}
          </Text>
        ) : null}
      </View>

      <View style={styles.reorderCircle}>
        <RefreshCcw size={18} color={colors.white} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

function OrderRowMedia({ imageUri, videoUri }: { imageUri?: string; videoUri?: string }) {
  const videoSource = useMemo<VideoSource | null>(
    () =>
      videoUri
        ? {
            uri: videoUri,
            contentType: "progressive",
            useCaching: true,
          }
        : null,
    [videoUri],
  );
  const [imageFailed, setImageFailed] = useState(false);
  const [hasRenderedVideoFrame, setHasRenderedVideoFrame] = useState(false);
  const player = useVideoPlayer(videoSource, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.volume = 0;
    videoPlayer.audioMixingMode = "mixWithOthers";
  });

  useEffect(() => {
    if (!videoSource) return undefined;

    try {
      player.play();
    } catch {
      // The static fallback remains visible if the preview cannot start.
    }

    return () => {
      try {
        player.pause();
      } catch {
        // Ignore cleanup failures from native video state.
      }
    };
  }, [player, videoSource]);

  useEffect(() => {
    setHasRenderedVideoFrame(false);
  }, [videoUri]);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUri]);

  const shouldShowImage = Boolean(imageUri && !imageFailed && (!videoSource || !hasRenderedVideoFrame));

  return (
    <View style={styles.mediaWrap}>
      {shouldShowImage ? (
        <Image source={{ uri: imageUri }} style={styles.media} resizeMode="cover" onError={() => setImageFailed(true)} />
      ) : (
        <View style={[styles.media, styles.mediaFallback]} />
      )}

      {videoSource ? (
        <>
          <VideoView
            player={player}
            style={[styles.mediaOverlay, !hasRenderedVideoFrame && styles.mediaHidden]}
            contentFit="cover"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture={false}
            playsInline
            pointerEvents="none"
            surfaceType="textureView"
            useExoShutter={false}
            onFirstFrameRender={() => setHasRenderedVideoFrame((current) => current || true)}
          />
          <View pointerEvents="none" style={styles.videoBadge}>
            <Play size={10} color={colors.white} fill={colors.white} strokeWidth={2.2} />
          </View>
        </>
      ) : null}
    </View>
  );
}

function statusLabel(status: OrderStatus, tr: (ro: string, en: string) => string) {
  if (status === "delivered") return tr("Livrată", "Delivered");
  if (status === "on_the_way" || status === "picked_up") return tr("În livrare", "On the way");
  if (status === "preparing" || status === "accepted" || status === "ready_for_pickup") return tr("În preparare", "Preparing");
  if (status === "cancelled" || status === "rejected") return tr("Anulată", "Cancelled");
  return tr("Plasată", "Placed");
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  titleBlock: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "600",
    color: colors.white,
    letterSpacing: -0.4,
  },
  productLine: {
    marginTop: 2,
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "400",
  },
  errorBanner: {
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: -4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.dangerSoft,
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 18,
    gap: 0,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  row: {
    minHeight: 112,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowPressed: {
    opacity: 0.84,
  },
  mediaWrap: {
    width: 78,
    height: 78,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaHidden: {
    opacity: 0,
  },
  mediaFallback: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  videoBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.56)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  restaurantName: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "400",
  },
  metaText: {
    marginTop: 2,
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "400",
  },
  totalValue: {
    marginTop: 1,
    color: colors.white,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "400",
  },
  reorderCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 10,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
    marginBottom: 4,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
});
