import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useVideoPlayer } from "expo-video";
import { Banknote, Bell, House, LocateFixed, MessageCircleMore, Phone, ShoppingBag, Store, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import courierMapStyle from "../../mapbox/yumzy-courier-style.json";
import { PrimaryButton } from "../components/PrimaryButton";
import { getMapboxAccessToken } from "../config/mapbox";
import { getMapboxModule } from "../lib/mapboxRuntime";
import { colors } from "../theme/colors";

type MapCoordinate = {
  latitude: number;
  longitude: number;
  heading?: number | null;
};

type RestaurantMapPin = {
  id: string;
  name: string;
  address: string;
  imageUrl: string;
  coordinate: MapCoordinate;
  cuisine: string;
  queueOrders: number;
  payoutRange: string;
};

type SimulatedOfferItem = {
  id: string;
  name: string;
  quantity: number;
  accentColor: string;
  imageUrl: string;
  unitPrice: number;
};

type SimulatedOffer = {
  id: string;
  orderCode: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantImageUrl: string;
  restaurantCoordinate: MapCoordinate;
  payoutLabel: string;
  restaurantPhone: string;
  restaurantNote: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCoordinate: MapCoordinate;
  itemsSummary: string;
  items: SimulatedOfferItem[];
  itemCount: number;
  pickupDistanceKm: number;
  pickupEtaMinutes: number;
  dropoffDistanceKm: number;
  dropoffEtaMinutes: number;
  totalDistanceKm: number;
  totalEtaMinutes: number;
};

type RouteMetrics = {
  distanceKm: number;
  durationMinutes: number;
};

type AcceptedOfferStage = "pickup" | "dropoff";

type Props = {
  currentLatitude?: string | number | null;
  currentLongitude?: string | number | null;
  targetLatitude?: string | number | null;
  targetLongitude?: string | number | null;
};

const TULCEA_RESTAURANT_PINS: RestaurantMapPin[] = [
  { id: "tulcea-bistro-delta", name: "Bistro Delta", address: "Str. Portului 12, Tulcea", imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=200&q=80", coordinate: { latitude: 45.1794, longitude: 28.8012 }, cuisine: "Bistro", queueOrders: 2, payoutRange: "22-34 lei" },
  { id: "tulcea-casa-portului", name: "Casa Portului", address: "Str. Isaccei 8, Tulcea", imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80", coordinate: { latitude: 45.1808, longitude: 28.8046 }, cuisine: "Seafood", queueOrders: 3, payoutRange: "24-38 lei" },
  { id: "tulcea-danube-grill", name: "Danube Grill", address: "Str. Babadag 21, Tulcea", imageUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=200&q=80", coordinate: { latitude: 45.1769, longitude: 28.7928 }, cuisine: "Grill", queueOrders: 1, payoutRange: "18-27 lei" },
  { id: "tulcea-faleza-fish-house", name: "Faleza Fish House", address: "Str. Mahmudiei 4, Tulcea", imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=200&q=80", coordinate: { latitude: 45.1835, longitude: 28.8081 }, cuisine: "Fish", queueOrders: 4, payoutRange: "26-42 lei" },
  { id: "tulcea-piata-veche-kitchen", name: "Piata Veche Kitchen", address: "Str. Pacii 18, Tulcea", imageUrl: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=200&q=80", coordinate: { latitude: 45.1782, longitude: 28.7965 }, cuisine: "Comfort Food", queueOrders: 2, payoutRange: "20-31 lei" },
  { id: "tulcea-riverside-burger", name: "Riverside Burger", address: "Str. Garii 6, Tulcea", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80", coordinate: { latitude: 45.1776, longitude: 28.7921 }, cuisine: "Burgers", queueOrders: 3, payoutRange: "21-33 lei" },
  { id: "tulcea-cezar-test-kitchen", name: "Cezar Test Kitchen", address: "Str. Cezar 1, Tulcea", imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=200&q=80", coordinate: { latitude: 45.173688, longitude: 28.80201 }, cuisine: "Test Orders", queueOrders: 1, payoutRange: "19-30 lei" },
  { id: "tulcea-qq-test-point", name: "QQ Test Point", address: "Str. Test 45, Tulcea", imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=200&q=80", coordinate: { latitude: 45.17591130853162, longitude: 28.802164048085512 }, cuisine: "Test Orders", queueOrders: 1, payoutRange: "20-29 lei" },
];

const MAX_QQ_RESTAURANTS = 3;

const MAPBOX_STYLE_JSON = JSON.stringify(courierMapStyle);
const MAPBOX_STYLE_KEY = `${courierMapStyle.name}-${courierMapStyle.layers.length}`;
const MAPBOX_TOKEN = getMapboxAccessToken();
const MAPBOX_MODULE = getMapboxModule();
const NAVIGATION_CAMERA_PITCH = 48;
const NAVIGATION_CAMERA_ZOOM = 16.4;
const NAVIGATION_CAMERA_ANIMATION_MS = 900;
const ROUTE_LINE_COLOR = "#8B5CF6";
const PICKUP_AUTO_OPEN_DISTANCE_KM = 0.01;
const QQ_ENABLE_HAPTIC_DURATION = 12;
const QQ_ENABLE_HAPTIC_GAP_MS = 90;
const QQ_DISABLE_HAPTIC_DURATION = 12;
const QQ_ORDER_ALERT_VIBRATION_PATTERN = [0, 500, 250, 500];
const SIMULATED_OFFER_DELAY_MS = 4000;
const OFFER_RESPONSE_WINDOW_SECONDS = 30;
const QQ_ORDER_ALERT_SOUND = require("../../assets/qq-order-alert.wav");
const SIMULATED_CUSTOMER_STOPS: Record<
  string,
  {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    coordinate: MapCoordinate;
    itemsSummary: string;
    items: SimulatedOfferItem[];
    itemCount: number;
    payoutLabel: string;
    restaurantPhone: string;
    restaurantNote: string;
  }
> = {
  "tulcea-bistro-delta": {
    customerName: "Ana Popescu",
    customerPhone: "+40740121222",
    customerAddress: "Str. Isaccei 41, Tulcea",
    coordinate: { latitude: 45.1732, longitude: 28.7909 },
    itemsSummary: "2x burger menu, 1x lemonade",
    items: [
      { id: "burger-menu", name: "Burger menu", quantity: 2, unitPrice: 28, accentColor: "#F97316", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=160&q=80" },
      { id: "lemonade", name: "Lemonade", quantity: 1, unitPrice: 11, accentColor: "#22C55E", imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=160&q=80" },
    ],
    itemCount: 3,
    payoutLabel: "28 lei",
    restaurantPhone: "+40740111222",
    restaurantNote: "Te rugăm să spui codul comenzii la ridicare.",
  },
  "tulcea-casa-portului": {
    customerName: "Radu Ionescu",
    customerPhone: "+40740121333",
    customerAddress: "Str. Babadag 87, Tulcea",
    coordinate: { latitude: 45.1715, longitude: 28.8068 },
    itemsSummary: "1x fish soup, 1x grilled dorada",
    items: [
      { id: "fish-soup", name: "Fish soup", quantity: 1, unitPrice: 19, accentColor: "#0EA5E9", imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=160&q=80" },
      { id: "dorada", name: "Grilled dorada", quantity: 1, unitPrice: 36, accentColor: "#14B8A6", imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=160&q=80" },
    ],
    itemCount: 2,
    payoutLabel: "33 lei",
    restaurantPhone: "+40740111333",
    restaurantNote: "Ridicarea se face de la tejgheaua principală.",
  },
  "tulcea-danube-grill": {
    customerName: "Mihai Enache",
    customerPhone: "+40740121444",
    customerAddress: "Str. Garii 12, Tulcea",
    coordinate: { latitude: 45.1822, longitude: 28.7867 },
    itemsSummary: "2x mici menu, 1x fries",
    items: [
      { id: "mici-menu", name: "Mici menu", quantity: 2, unitPrice: 24, accentColor: "#F59E0B", imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=160&q=80" },
      { id: "fries", name: "Fries", quantity: 1, unitPrice: 9, accentColor: "#EAB308", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=160&q=80" },
    ],
    itemCount: 3,
    payoutLabel: "24 lei",
    restaurantPhone: "+40740111444",
    restaurantNote: "Comanda se predă la zona de grill.",
  },
  "tulcea-faleza-fish-house": {
    customerName: "Ioana Marin",
    customerPhone: "+40740121555",
    customerAddress: "Str. Mahmudiei 19, Tulcea",
    coordinate: { latitude: 45.1881, longitude: 28.8152 },
    itemsSummary: "1x seafood platter, 2x water",
    items: [
      { id: "seafood-platter", name: "Seafood platter", quantity: 1, unitPrice: 42, accentColor: "#06B6D4", imageUrl: "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=160&q=80" },
      { id: "water", name: "Water", quantity: 2, unitPrice: 6, accentColor: "#60A5FA", imageUrl: "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=160&q=80" },
    ],
    itemCount: 3,
    payoutLabel: "36 lei",
    restaurantPhone: "+40740111555",
    restaurantNote: "Te rugăm să verifici sigiliul pungii înainte de plecare.",
  },
  "tulcea-piata-veche-kitchen": {
    customerName: "Carmen Stoica",
    customerPhone: "+40740121666",
    customerAddress: "Str. Pacii 65, Tulcea",
    coordinate: { latitude: 45.1751, longitude: 28.8011 },
    itemsSummary: "1x pasta, 1x salad",
    items: [
      { id: "pasta", name: "Pasta", quantity: 1, unitPrice: 26, accentColor: "#FB7185", imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=160&q=80" },
      { id: "salad", name: "Salad", quantity: 1, unitPrice: 18, accentColor: "#22C55E", imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=160&q=80" },
    ],
    itemCount: 2,
    payoutLabel: "26 lei",
    restaurantPhone: "+40740111666",
    restaurantNote: "Ridicarea se face de la zona takeaway.",
  },
  "tulcea-riverside-burger": {
    customerName: "Alex Dobre",
    customerPhone: "+40740121777",
    customerAddress: "Str. 1848 23, Tulcea",
    coordinate: { latitude: 45.1811, longitude: 28.7879 },
    itemsSummary: "2x smash burger, 1x cola",
    items: [
      { id: "smash-burger", name: "Smash burger", quantity: 2, unitPrice: 27, accentColor: "#DC2626", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=160&q=80" },
      { id: "cola", name: "Cola", quantity: 1, unitPrice: 8, accentColor: "#1F2937", imageUrl: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=160&q=80" },
    ],
    itemCount: 3,
    payoutLabel: "29 lei",
    restaurantPhone: "+40740111777",
    restaurantNote: "Comanda se ridică de la pickup window.",
  },
  "tulcea-cezar-test-kitchen": {
    customerName: "Bianca Matei",
    customerPhone: "+40740121888",
    customerAddress: "Str. Victoriei 14, Tulcea",
    coordinate: { latitude: 45.1764, longitude: 28.8041 },
    itemsSummary: "mix produse test scroll",
    items: [
      { id: "ciorba-zilei", name: "Ciorba zilei", quantity: 1, unitPrice: 18, accentColor: "#F97316", imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=160&q=80" },
      { id: "crispy-menu", name: "Crispy menu", quantity: 2, unitPrice: 29, accentColor: "#FACC15", imageUrl: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=160&q=80" },
      { id: "apa", name: "Apă", quantity: 1, unitPrice: 6, accentColor: "#38BDF8", imageUrl: "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=160&q=80" },
      { id: "cheese-burger", name: "Cheese burger", quantity: 1, unitPrice: 22, accentColor: "#DC2626", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=160&q=80" },
      { id: "loaded-fries", name: "Loaded fries", quantity: 1, unitPrice: 14, accentColor: "#EAB308", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=160&q=80" },
      { id: "caesar-salad", name: "Caesar salad", quantity: 1, unitPrice: 17, accentColor: "#22C55E", imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=160&q=80" },
      { id: "pasta-arrabiata", name: "Pasta arrabiata", quantity: 1, unitPrice: 24, accentColor: "#FB7185", imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=160&q=80" },
      { id: "tiramisu", name: "Tiramisu", quantity: 2, unitPrice: 16, accentColor: "#A16207", imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=160&q=80" },
      { id: "fresh-orange", name: "Fresh orange", quantity: 1, unitPrice: 13, accentColor: "#F97316", imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=160&q=80" },
    ],
    itemCount: 11,
    payoutLabel: "27 lei",
    restaurantPhone: "+40740111888",
    restaurantNote: "Te rugăm să spui codul comenzii la ridicare.",
  },
  "tulcea-qq-test-point": {
    customerName: "Daria Ilie",
    customerPhone: "+40740121999",
    customerAddress: "Str. Test Client 12, Tulcea",
    coordinate: { latitude: 45.17374727616608, longitude: 28.8015681165664 },
    itemsSummary: "1x burger menu, 1x apă",
    items: [
      { id: "burger-menu-test", name: "Burger menu", quantity: 1, unitPrice: 27, accentColor: "#F97316", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=160&q=80" },
      { id: "water-test", name: "Apă", quantity: 1, unitPrice: 6, accentColor: "#38BDF8", imageUrl: "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=160&q=80" },
    ],
    itemCount: 2,
    payoutLabel: "24 lei",
    restaurantPhone: "+40740111999",
    restaurantNote: "Comanda de test se ridică de la tejghea.",
  },
};

export function CourierLiveMap({
  currentLatitude,
  currentLongitude,
  targetLatitude,
  targetLongitude,
}: Props) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<any>(null);
  const [deviceCoordinate, setDeviceCoordinate] = useState<MapCoordinate | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [queuedRestaurantIds, setQueuedRestaurantIds] = useState<string[]>([]);
  const [pendingOffer, setPendingOffer] = useState<SimulatedOffer | null>(null);
  const [acceptedOffer, setAcceptedOffer] = useState<SimulatedOffer | null>(null);
  const [acceptedOfferStage, setAcceptedOfferStage] = useState<AcceptedOfferStage>("pickup");
  const [remainingOfferSeconds, setRemainingOfferSeconds] = useState(OFFER_RESPONSE_WINDOW_SECONDS);
  const [queueFeedbackMessage, setQueueFeedbackMessage] = useState<string | null>(null);
  const [routeShape, setRouteShape] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const bottomSheetModalRef = useRef<BottomSheetModal | null>(null);
  const hapticTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const simulatedOfferTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedMarkerPulse = useRef(new Animated.Value(0)).current;
  const alertPlayer = useVideoPlayer(QQ_ORDER_ALERT_SOUND, (player) => {
    player.muted = false;
    player.volume = 1;
    player.loop = true;
  });
  const profileCoordinate = normalizeCoordinate(currentLatitude, currentLongitude);
  const current = deviceCoordinate ?? profileCoordinate;
  const target = normalizeCoordinate(targetLatitude, targetLongitude);
  const previewRouteStops = useMemo(() => (pendingOffer ? [pendingOffer.restaurantCoordinate] : []), [pendingOffer]);
  const acceptedOfferTarget = useMemo(() => {
    if (!acceptedOffer) {
      return null;
    }

    return acceptedOfferStage === "pickup" ? acceptedOffer.restaurantCoordinate : acceptedOffer.customerCoordinate;
  }, [acceptedOffer, acceptedOfferStage]);
  const activeRouteStops = useMemo(() => {
    if (target) {
      return [target];
    }

    if (acceptedOfferTarget) {
      return [acceptedOfferTarget];
    }

    return previewRouteStops;
  }, [acceptedOfferTarget, previewRouteStops, target]);
  const effectiveTarget = activeRouteStops[activeRouteStops.length - 1] ?? null;
  const shouldFitActiveRoute = Boolean(pendingOffer);
  const customerMarkerCoordinate = target ?? (acceptedOfferStage === "dropoff" ? acceptedOffer?.customerCoordinate : null);
  const isNavigationActive = Boolean(current && activeRouteStops.length > 0);
  const restaurantPins = useMemo(() => TULCEA_RESTAURANT_PINS, []);
  const cameraConfig = useMemo(
    () => buildCameraConfig(current, effectiveTarget, restaurantPins, activeRouteStops, shouldFitActiveRoute),
    [activeRouteStops, current, effectiveTarget, restaurantPins, shouldFitActiveRoute],
  );
  const selectedRestaurant = useMemo(
    () => restaurantPins.find((restaurant) => restaurant.id === selectedRestaurantId) ?? null,
    [restaurantPins, selectedRestaurantId],
  );
  const isSelectedRestaurantQueued = selectedRestaurant ? queuedRestaurantIds.includes(selectedRestaurant.id) : false;
  const isOfferSheetVisible = Boolean(pendingOffer);
  const pickupDistanceToAcceptedRestaurantKm = useMemo(() => {
    if (!acceptedOffer || acceptedOfferStage !== "pickup") {
      return null;
    }

    const candidateDistances = [deviceCoordinate, profileCoordinate]
      .filter((coordinate): coordinate is MapCoordinate => Boolean(coordinate))
      .map((coordinate) => calculateDistanceKm(coordinate, acceptedOffer.restaurantCoordinate));

    if (candidateDistances.length === 0) {
      return null;
    }

    return Math.min(...candidateDistances);
  }, [acceptedOffer, acceptedOfferStage, deviceCoordinate, profileCoordinate]);
  const isCourierNearAcceptedRestaurant = Boolean(
    pickupDistanceToAcceptedRestaurantKm !== null && pickupDistanceToAcceptedRestaurantKm <= PICKUP_AUTO_OPEN_DISTANCE_KM,
  );
  const isPickupSheetVisible = Boolean(acceptedOffer && acceptedOfferStage === "pickup" && isCourierNearAcceptedRestaurant);
  const acceptedOfferItems = useMemo(() => acceptedOffer?.items ?? [], [acceptedOffer]);
  const pickupSheetItems = useMemo(() => acceptedOfferItems.slice(0, 6), [acceptedOfferItems]);
  const snapPoints = useMemo(() => (isOfferSheetVisible ? ["46%"] : ["32%"]), [isOfferSheetVisible]);

  useEffect(() => {
    let mounted = true;
    let positionSubscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          return;
        }

        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        if (mounted) {
          setDeviceCoordinate({
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
            heading: normalizeHeading(initial.coords.heading),
          });
        }

        positionSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (position) => {
            if (!mounted) {
              return;
            }

            setDeviceCoordinate((currentCoordinate) => ({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              heading: normalizeHeading(position.coords.heading) ?? currentCoordinate?.heading ?? null,
            }));
          },
        );

        headingSubscription = await Location.watchHeadingAsync((heading) => {
          if (!mounted) {
            return;
          }

          setDeviceCoordinate((currentCoordinate) => {
            if (!currentCoordinate) {
              return currentCoordinate;
            }

            return {
              ...currentCoordinate,
              heading: normalizeHeading(heading.trueHeading) ?? normalizeHeading(heading.magHeading) ?? currentCoordinate.heading ?? null,
            };
          });
        });
      } catch {
        // Keep the map usable with backend coordinates if live GPS is unavailable.
      }
    };

    void startWatching();

    return () => {
      mounted = false;
      positionSubscription?.remove();
      headingSubscription?.remove();
      hapticTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      hapticTimeoutsRef.current = [];
      if (simulatedOfferTimeoutRef.current) {
        clearTimeout(simulatedOfferTimeoutRef.current);
        simulatedOfferTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!profileCoordinate) {
      return;
    }

    setDeviceCoordinate((currentCoordinate) => {
      if (!currentCoordinate) {
        return profileCoordinate;
      }

      const movedEnough = calculateDistanceKm(currentCoordinate, profileCoordinate) > 0.003;
      if (!movedEnough) {
        return currentCoordinate;
      }

      return {
        latitude: profileCoordinate.latitude,
        longitude: profileCoordinate.longitude,
        heading: currentCoordinate.heading ?? profileCoordinate.heading ?? null,
      };
    });
  }, [profileCoordinate]);

  useEffect(() => {
    if (!current || activeRouteStops.length === 0) {
      setRouteShape(null);
      setRouteMetrics(null);
      return;
    }

    const fallbackMetrics = buildFallbackRouteMetrics(current, activeRouteStops);
    setRouteMetrics(fallbackMetrics);

    if (!MAPBOX_TOKEN) {
      setRouteShape(null);
      return;
    }

    const abortController = new AbortController();

    const loadRoute = async () => {
      try {
        const route = await fetchMapboxRoute(current, activeRouteStops, MAPBOX_TOKEN, abortController.signal);
        setRouteShape(buildRouteShape(route.coordinates));
        setRouteMetrics({
          distanceKm: route.distanceMeters / 1000,
          durationMinutes: Math.max(1, Math.round(route.durationSeconds / 60)),
        });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setRouteMetrics(fallbackMetrics);
      }
    };

    void loadRoute();

    return () => {
      abortController.abort();
    };
  }, [activeRouteStops, current]);

  useEffect(() => {
    if (!current || !effectiveTarget || shouldFitActiveRoute) {
      return;
    }

    cameraRef.current?.setCamera({
      centerCoordinate: [current.longitude, current.latitude],
      zoomLevel: NAVIGATION_CAMERA_ZOOM,
      pitch: NAVIGATION_CAMERA_PITCH,
      heading: current.heading ?? 0,
      animationMode: "easeTo",
      animationDuration: NAVIGATION_CAMERA_ANIMATION_MS,
    });
  }, [current, effectiveTarget, shouldFitActiveRoute]);

  const clearPendingHaptics = useCallback(() => {
    hapticTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    hapticTimeoutsRef.current = [];
    Vibration.cancel();
  }, []);

  const triggerQueueEnabledHaptic = useCallback(() => {
    clearPendingHaptics();
    Vibration.vibrate(QQ_ENABLE_HAPTIC_DURATION);
    const timeoutId = setTimeout(() => {
      Vibration.vibrate(QQ_ENABLE_HAPTIC_DURATION);
      hapticTimeoutsRef.current = hapticTimeoutsRef.current.filter((id) => id !== timeoutId);
    }, QQ_ENABLE_HAPTIC_GAP_MS);
    hapticTimeoutsRef.current.push(timeoutId);
  }, [clearPendingHaptics]);

  const triggerQueueDisabledHaptic = useCallback(() => {
    clearPendingHaptics();
    Vibration.vibrate(QQ_DISABLE_HAPTIC_DURATION);
  }, [clearPendingHaptics]);

  const stopOfferAlert = useCallback(() => {
    clearPendingHaptics();
    try {
      alertPlayer.loop = false;
      alertPlayer.muted = true;
      alertPlayer.pause();
      alertPlayer.currentTime = 0;
    } catch {
      // Ignorăm dacă player-ul nu este disponibil exact în acel moment.
    }
  }, [alertPlayer, clearPendingHaptics]);

  const startOfferAlert = useCallback(() => {
    clearPendingHaptics();
    Vibration.vibrate(QQ_ORDER_ALERT_VIBRATION_PATTERN, true);
    try {
      alertPlayer.muted = false;
      alertPlayer.loop = true;
      alertPlayer.currentTime = 0;
      alertPlayer.play();
    } catch {
      // Dacă player-ul nu este pregătit, vibrația rămâne fallback-ul principal.
    }
  }, [alertPlayer, clearPendingHaptics]);

  useEffect(() => {
    if (target || acceptedOfferTarget) {
      bottomSheetModalRef.current?.dismiss();
      setSelectedRestaurantId(null);
    }
  }, [acceptedOfferTarget, target]);

  useEffect(() => {
    if (!pendingOffer) {
      setRemainingOfferSeconds(OFFER_RESPONSE_WINDOW_SECONDS);
      stopOfferAlert();
      return;
    }

    setRemainingOfferSeconds(OFFER_RESPONSE_WINDOW_SECONDS);
    setSelectedRestaurantId(null);
    startOfferAlert();
    requestAnimationFrame(() => {
      const sheet = bottomSheetModalRef.current;
      if (!sheet) {
        return;
      }

      sheet.present();
      requestAnimationFrame(() => {
        sheet.snapToIndex(0);
      });
    });
  }, [pendingOffer, startOfferAlert, stopOfferAlert]);

  useEffect(() => {
    if (queuedRestaurantIds.length === 0) {
      queuedMarkerPulse.stopAnimation();
      queuedMarkerPulse.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(queuedMarkerPulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(queuedMarkerPulse, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
      queuedMarkerPulse.stopAnimation();
    };
  }, [queuedMarkerPulse, queuedRestaurantIds.length]);

  const handleRestaurantPress = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    requestAnimationFrame(() => {
      const sheet = bottomSheetModalRef.current;
      if (!sheet) {
        return;
      }

      sheet.present();
      requestAnimationFrame(() => {
        sheet.snapToIndex(0);
      });
    });
  };

  const handleCloseQueueSheet = () => {
    bottomSheetModalRef.current?.dismiss();
  };

  const handleSheetDismiss = useCallback(() => {
    if (pendingOffer) {
      stopOfferAlert();
      setPendingOffer(null);
      setQueueFeedbackMessage("Oferta simulată a fost închisă.");
      return;
    }

    setSelectedRestaurantId(null);
  }, [pendingOffer, stopOfferAlert]);

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) {
      if (pendingOffer) {
        stopOfferAlert();
        setPendingOffer(null);
        setQueueFeedbackMessage("Oferta simulată a fost închisă.");
        return;
      }

      setSelectedRestaurantId(null);
    }
  }, [pendingOffer, stopOfferAlert]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.18}
        pressBehavior={pendingOffer ? "none" : "close"}
      />
    ),
    [pendingOffer],
  );

  const handleToggleQueue = () => {
    if (!selectedRestaurant) {
      return;
    }

    setQueueFeedbackMessage(null);
    setQueuedRestaurantIds((currentQueue) => {
      if (currentQueue.includes(selectedRestaurant.id)) {
        triggerQueueDisabledHaptic();
        if (simulatedOfferTimeoutRef.current) {
          clearTimeout(simulatedOfferTimeoutRef.current);
          simulatedOfferTimeoutRef.current = null;
        }
        if (acceptedOffer?.restaurantId === selectedRestaurant.id) {
          setAcceptedOffer(null);
        }
        if (pendingOffer?.restaurantId === selectedRestaurant.id) {
          setPendingOffer(null);
        }
        return currentQueue.filter((restaurantId) => restaurantId !== selectedRestaurant.id);
      }
      if (currentQueue.length >= MAX_QQ_RESTAURANTS) {
        return currentQueue;
      }
      triggerQueueEnabledHaptic();
      return [...currentQueue, selectedRestaurant.id];
    });
  };

  const triggerIncomingOfferAlert = useCallback(async (offer: SimulatedOffer) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Comandă nouă în QQ",
          body: `${offer.restaurantName} • ${offer.customerAddress}`,
          sound: "default",
          ...(Platform.OS === "android" ? { channelId: "orders" } : null),
          data: {
            source: "qq-simulated-offer",
            restaurantId: offer.restaurantId,
          },
        },
        trigger: null,
      });
    } catch {
      // Modalul rămâne canalul principal dacă sistemul nu poate reda notificarea locală.
    }
  }, []);

  const handleSimulateOffer = useCallback(() => {
    if (!selectedRestaurant) {
      return;
    }
    if (!queuedRestaurantIds.includes(selectedRestaurant.id)) {
      setQueueFeedbackMessage("Curierul trebuie să fie în QQ la restaurant ca să poată primi oferta simulată.");
      return;
    }
    if (target) {
      setQueueFeedbackMessage("Există deja o comandă activă. Simularea locală este blocată până când traseul curent se încheie.");
      return;
    }
    if (simulatedOfferTimeoutRef.current) {
      setQueueFeedbackMessage("Simularea este deja în curs. Oferta va apărea în câteva secunde.");
      return;
    }

    // Dacă un curier este deja în QQ la restaurant, pentru simulare îl tratăm ca fiind prezent acolo,
    // chiar dacă locația live nu a fost încă actualizată exact în aplicație.
    const courierReferenceCoordinate = current ?? selectedRestaurant.coordinate;
    const offer = buildSimulatedOffer(selectedRestaurant, courierReferenceCoordinate);
    setQueueFeedbackMessage("Simularea a pornit. Oferta va apărea în 4 secunde.");
    simulatedOfferTimeoutRef.current = setTimeout(() => {
      setPendingOffer(offer);
      setQueueFeedbackMessage("Oferta simulată a ajuns la curier.");
      simulatedOfferTimeoutRef.current = null;
      void triggerIncomingOfferAlert(offer);
    }, SIMULATED_OFFER_DELAY_MS);
  }, [current, queuedRestaurantIds, selectedRestaurant, target, triggerIncomingOfferAlert]);

  const handleDeclineOffer = useCallback(() => {
    if (simulatedOfferTimeoutRef.current) {
      clearTimeout(simulatedOfferTimeoutRef.current);
      simulatedOfferTimeoutRef.current = null;
    }
    stopOfferAlert();
    setRemainingOfferSeconds(OFFER_RESPONSE_WINDOW_SECONDS);
    bottomSheetModalRef.current?.dismiss();
    setPendingOffer(null);
    setQueueFeedbackMessage("Oferta simulată a fost refuzată.");
  }, [stopOfferAlert]);

  useEffect(() => {
    if (!pendingOffer) {
      return;
    }

    const intervalId = setInterval(() => {
      setRemainingOfferSeconds((currentSeconds) => {
        if (currentSeconds <= 1) {
          clearInterval(intervalId);
          handleDeclineOffer();
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [handleDeclineOffer, pendingOffer]);

  const handleAcceptOffer = useCallback(() => {
    if (!pendingOffer) {
      return;
    }

    stopOfferAlert();
    setAcceptedOfferStage("pickup");
    setAcceptedOffer(pendingOffer);
    bottomSheetModalRef.current?.dismiss();
    setPendingOffer(null);
    setQueueFeedbackMessage("Comanda simulată a fost acceptată. Traseul către restaurant este afișat pe hartă.");
    bottomSheetModalRef.current?.dismiss();
    setSelectedRestaurantId(null);
  }, [pendingOffer, stopOfferAlert]);

  const handleMarkOfferPickedUp = useCallback(() => {
    if (!acceptedOffer) {
      return;
    }

    bottomSheetModalRef.current?.dismiss();
    setSelectedRestaurantId(null);
    setAcceptedOfferStage("dropoff");
    setQueueFeedbackMessage("Comanda a fost ridicată. Traseul către client este acum afișat pe hartă.");
  }, [acceptedOffer]);

  const handleCallRestaurant = useCallback(() => {
    if (!acceptedOffer?.restaurantPhone) {
      return;
    }

    void Linking.openURL(`tel:${acceptedOffer.restaurantPhone}`);
  }, [acceptedOffer]);

  const handleCallCustomer = useCallback(() => {
    if (!acceptedOffer?.customerPhone) {
      return;
    }

    void Linking.openURL(`tel:${acceptedOffer.customerPhone}`);
  }, [acceptedOffer]);

  const handleClearAcceptedOffer = useCallback(() => {
    setAcceptedOffer(null);
    setAcceptedOfferStage("pickup");
    setQueueFeedbackMessage("Simularea traseului a fost închisă.");
  }, []);

  const handleRecenterPress = useCallback(() => {
    if (!current) {
      return;
    }

    cameraRef.current?.setCamera({
      centerCoordinate: [current.longitude, current.latitude],
      zoomLevel: isNavigationActive ? NAVIGATION_CAMERA_ZOOM : 15.2,
      pitch: isNavigationActive ? NAVIGATION_CAMERA_PITCH : 0,
      heading: isNavigationActive ? current.heading ?? 0 : 0,
      animationMode: "easeTo",
      animationDuration: 700,
    });
  }, [current, isNavigationActive]);

  const animatedQueuedMarkerHaloStyle = {
    opacity: queuedMarkerPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.34, 0],
    }),
    transform: [
      {
        scale: queuedMarkerPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.9],
        }),
      },
    ],
  };

  if (!MAPBOX_TOKEN || !MAPBOX_MODULE) {
    return (
      <View style={styles.fallback}>
        <View style={styles.fallbackPanel}>
          <Text style={styles.fallbackEyebrow}>Mapbox Unavailable</Text>
          <Text style={styles.fallbackTitle}>
            {!MAPBOX_TOKEN ? "Set `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`" : "Rebuild the courier app"}
          </Text>
          <Text style={styles.fallbackBody}>
            {!MAPBOX_TOKEN
              ? "Dashboard-ul este pregătit pentru Mapbox, dar lipsește tokenul public necesar pentru randarea hărții."
              : "Pachetul `@rnmapbox/maps` este instalat, dar buildul curent nu include încă modulul nativ. Rulează un rebuild al aplicației courier."}
          </Text>
        </View>
      </View>
    );
  }

  const { Camera, LineLayer, MarkerView, ShapeSource } = MAPBOX_MODULE;

  return (
    <View style={styles.container}>
      <MAPBOX_MODULE.MapView
        key={MAPBOX_STYLE_KEY}
        style={styles.map}
        styleJSON={MAPBOX_STYLE_JSON}
        pitchEnabled
        rotateEnabled
        attributionEnabled={false}
        logoEnabled={false}
        scaleBarEnabled={false}
      >
        <Camera
          ref={cameraRef}
          animationMode="easeTo"
          animationDuration={NAVIGATION_CAMERA_ANIMATION_MS}
          defaultSettings={cameraConfig}
          {...cameraConfig}
        />

        {routeShape ? (
          <ShapeSource id="courier-route" shape={routeShape} lineMetrics>
            <LineLayer
              id="courier-route-line"
              style={{
                lineColor: ROUTE_LINE_COLOR,
                lineWidth: 6,
                lineOpacity: 0.92,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </ShapeSource>
        ) : null}

        {!target
          ? restaurantPins.map((restaurant) => (
              <MarkerView
                key={restaurant.id}
                coordinate={[restaurant.coordinate.longitude, restaurant.coordinate.latitude]}
                anchor={{ x: 0.5, y: 1 }}
              >
                <Pressable onPress={() => handleRestaurantPress(restaurant.id)} style={styles.restaurantMarkerPressable}>
                  <View style={styles.restaurantMarkerWrap}>
                    <View
                      style={[
                        styles.restaurantMarkerLabel,
                        selectedRestaurantId === restaurant.id && styles.restaurantMarkerLabelSelected,
                      ]}
                    >
                      <Text style={styles.restaurantMarkerLabelText}>{restaurant.name}</Text>
                    </View>
                    <View style={styles.restaurantMarkerPinStack}>
                      <View style={styles.restaurantMarkerStem} />
                      <View
                        style={[
                          styles.restaurantMarkerPin,
                          queuedRestaurantIds.includes(restaurant.id) && styles.restaurantMarkerPinQueued,
                          selectedRestaurantId === restaurant.id && styles.restaurantMarkerPinSelected,
                        ]}
                      >
                        {queuedRestaurantIds.includes(restaurant.id) ? (
                          <Animated.View style={[styles.restaurantMarkerPulseHalo, animatedQueuedMarkerHaloStyle]} />
                        ) : null}
                        <View style={styles.restaurantMarkerPinCore}>
                          <Store
                            color={queuedRestaurantIds.includes(restaurant.id) ? colors.black : colors.white}
                            size={14}
                            strokeWidth={2.4}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </MarkerView>
            ))
          : null}

        {current ? (
          <MarkerView
            key={`courier-live-${current.latitude.toFixed(6)}-${current.longitude.toFixed(6)}-${Math.round(current.heading ?? 0)}`}
            coordinate={[current.longitude, current.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.liveMarkerContainer}>
              <View style={[styles.liveMarkerDirection, { transform: [{ rotate: `${current.heading ?? 0}deg` }] }]}>
                <View style={styles.liveMarkerArrowOutline} />
                <View style={styles.liveMarkerArrowFill} />
                <View style={styles.liveMarkerBase}>
                  <View style={styles.liveMarkerBaseDot} />
                </View>
              </View>
            </View>
          </MarkerView>
        ) : null}

        {customerMarkerCoordinate ? (
          <MarkerView
            coordinate={[customerMarkerCoordinate.longitude, customerMarkerCoordinate.latitude]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.dropoffMarkerWrap}>
              <View style={styles.dropoffMarker}>
                <House color={colors.white} size={16} strokeWidth={2.5} />
              </View>
              <View style={styles.dropoffMarkerTail} />
            </View>
          </MarkerView>
        ) : null}
      </MAPBOX_MODULE.MapView>

      <Pressable
        accessibilityLabel="Center map on my location"
        accessibilityRole="button"
        disabled={!current}
        onPress={handleRecenterPress}
        style={({ pressed }) => [
          styles.recenterButton,
          !current && styles.recenterButtonDisabled,
          pressed && current && styles.recenterButtonPressed,
        ]}
      >
        <LocateFixed color={colors.text} size={20} strokeWidth={2.4} />
      </Pressable>

      {pendingOffer ? (
        <Pressable
          accessibilityLabel="Refuză comanda"
          accessibilityRole="button"
          onPress={handleDeclineOffer}
          style={({ pressed }) => [styles.offerDeclineFloatingButton, pressed && styles.offerDeclineFloatingButtonPressed]}
        >
          <Text style={styles.offerDeclineFloatingButtonText}>Decline</Text>
        </Pressable>
      ) : null}

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={!pendingOffer}
        enableContentPanningGesture={Boolean(pendingOffer)}
        enableHandlePanningGesture={!pendingOffer}
        enableOverDrag={false}
        overDragResistanceFactor={1000}
        onChange={handleSheetChange}
        onDismiss={handleSheetDismiss}
        backdropComponent={pendingOffer ? undefined : renderBackdrop}
        handleIndicatorStyle={styles.nativeHandleIndicator}
        backgroundStyle={styles.nativeSheetBackground}
      >
        {pendingOffer ? (
          <BottomSheetView style={styles.offerSheetWrap}>
            <View style={styles.offerModalCard}>
              <View style={styles.offerSummaryRow}>
                <View style={styles.offerSummaryTitleBlock}>
                  <Text style={styles.offerDeliveryTitle}>Pickup location</Text>
                  <Text style={styles.offerRestaurantName}>{pendingOffer.restaurantName}</Text>
                </View>
                <View style={styles.offerCountdownBadge}>
                  <Text style={styles.offerCountdownText}>{remainingOfferSeconds}</Text>
                </View>
              </View>

              <View style={styles.offerSummaryCopy}>
                <Text style={styles.offerCustomerAddress}>{pendingOffer.restaurantAddress}</Text>
                <Text style={styles.offerCustomerEta}>{`${pendingOffer.pickupEtaMinutes} min • ${pendingOffer.pickupDistanceKm.toFixed(1)} km până la restaurant`}</Text>
              </View>

              <View style={styles.offerPriceBlock}>
                <Text style={styles.offerPriceValue}>{pendingOffer.payoutLabel}</Text>
              </View>

              <PrimaryButton
                onPress={handleAcceptOffer}
                title="Accept"
                flatEdges
                variant="lime"
                style={styles.offerAcceptButton}
              />
            </View>
          </BottomSheetView>
        ) : selectedRestaurant ? (
          <BottomSheetView style={styles.queueSheetWrap}>
            <View style={styles.queueSheet}>
                <View style={styles.queueSheetHeader}>
                  <View style={styles.queueSheetAvatar}>
                    <Image source={{ uri: selectedRestaurant.imageUrl }} style={styles.queueSheetAvatarImage} />
                  </View>
                  <View style={styles.queueSheetHeaderCopy}>
                    <View style={styles.queueSheetTitleRow}>
                      <Text style={styles.queueSheetTitle}>{selectedRestaurant.name}</Text>
                      <Text style={styles.queueSheetTitleDash}>-</Text>
                      <View style={styles.queueSheetPayoutInline}>
                        <Banknote color={colors.greenDark} size={20} strokeWidth={2.2} />
                        <Text style={styles.queueSheetPayoutInlineText}>{selectedRestaurant.payoutRange}</Text>
                      </View>
                    </View>
                    <Text style={styles.queueSheetSubtitle}>
                      {buildDistanceLabel(current, selectedRestaurant.coordinate)} - {buildEtaLabel(current, selectedRestaurant.coordinate)}
                    </Text>
                  </View>
                </View>

                <View style={styles.queueActions}>
                  <PrimaryButton
                    onPress={handleToggleQueue}
                    disabled={!isSelectedRestaurantQueued && queuedRestaurantIds.length >= MAX_QQ_RESTAURANTS}
                    icon={<Bell color={colors.black} size={26} strokeWidth={2.2} />}
                    flatEdges
                    variant={isSelectedRestaurantQueued ? "queued" : "lime"}
                    style={styles.queuePrimaryAction}
                  />
                </View>
                {isSelectedRestaurantQueued ? (
                  <View style={styles.queueSimulationPanel}>
                    <PrimaryButton
                      onPress={handleSimulateOffer}
                      title="Simulează comandă"
                      variant="ghost"
                      style={styles.queueSimulationButton}
                    />
                    {queueFeedbackMessage ? <Text style={styles.queueFeedbackMessage}>{queueFeedbackMessage}</Text> : null}
                  </View>
                ) : null}
              </View>
          </BottomSheetView>
        ) : (
          <BottomSheetView>
            <View />
          </BottomSheetView>
        )}
      </BottomSheetModal>

      {isPickupSheetVisible && acceptedOffer ? (
        <View style={[styles.pickupAutoSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <ScrollView
            style={styles.pickupAutoSheetScroll}
            contentContainerStyle={[styles.pickupAutoSheetScrollContent, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.pickupSheetHero}>
              <View style={styles.pickupSheetAvatar}>
                <Image source={{ uri: acceptedOffer.restaurantImageUrl }} style={styles.pickupSheetAvatarImage} />
              </View>
              <View style={styles.pickupSheetHeroCopy}>
                <Text style={styles.pickupSheetRestaurantName}>{acceptedOffer.restaurantName}</Text>
                <Text style={styles.pickupSheetAddress}>{acceptedOffer.restaurantAddress}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={handleCallRestaurant}
                style={({ pressed }) => [styles.pickupSheetIconButton, pressed && styles.pickupSheetIconButtonPressed]}
              >
                <Phone color={colors.text} size={24} strokeWidth={2.2} />
              </Pressable>
            </View>

            <View style={styles.pickupDetailsPanel}>
              <View style={styles.pickupSectionDivider} />

              <View style={styles.pickupSheetInfoRow}>
                <View style={styles.pickupSheetInfoBlock}>
                  <Text style={styles.pickupSheetInfoLabel}>Cod comandă</Text>
                  <Text style={styles.pickupSheetOrderCodeValue}>#{acceptedOffer.orderCode}</Text>
                </View>
                <View style={styles.pickupSheetInfoAside}>
                  <Text style={styles.pickupSheetProductCount}>{acceptedOffer.itemCount} produse</Text>
                  <ShoppingBag color={colors.text} size={20} strokeWidth={2.1} />
                </View>
              </View>

              <View style={styles.pickupSectionDivider} />

              <View style={styles.pickupDetailsHeader}>
                <Text style={styles.pickupDetailsTitle}>Produse comandate</Text>
              </View>
              <View style={styles.pickupItemsList}>
                {pickupSheetItems.map((item) => (
                  <View key={item.id} style={styles.pickupItemRow}>
                    <Image source={{ uri: item.imageUrl }} style={[styles.pickupItemThumb, { backgroundColor: item.accentColor }]} />
                    <View style={styles.pickupItemQtyBadge}>
                      <Text style={styles.pickupItemQtyText}>{item.quantity}x</Text>
                    </View>
                    <View style={styles.pickupItemCopy}>
                      <Text style={styles.pickupItemText}>{item.name}</Text>
                    </View>
                    <Text style={styles.pickupItemPrice}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.pickupSectionDivider} />

              <View style={styles.pickupNoteHeader}>
                <Text style={styles.pickupNoteTitle}>Notă restaurant</Text>
                <MessageCircleMore color={colors.text} size={22} strokeWidth={2} />
              </View>
              <Text style={styles.pickupNoteBody}>{acceptedOffer.restaurantNote}</Text>

              <PrimaryButton
                onPress={handleMarkOfferPickedUp}
                title="Confirmă ridicarea"
                flatEdges
                variant="lime"
                style={styles.pickupPrimaryButton}
              />
            </View>
          </ScrollView>
        </View>
      ) : null}

      {acceptedOffer && !target ? (
        <View style={styles.activeSimulationCard}>
          <View style={styles.activeSimulationTopRow}>
            <View style={styles.activeSimulationStatusWrap}>
              <View style={styles.activeSimulationStatusIcon}>
                {acceptedOfferStage === "pickup" ? (
                  <Store color={colors.black} size={15} strokeWidth={2.3} />
                ) : (
                  <House color={colors.black} size={15} strokeWidth={2.3} />
                )}
              </View>
              <View style={styles.activeSimulationStatusCopy}>
                <Text style={styles.activeSimulationTitle}>
                  {acceptedOfferStage === "pickup"
                    ? acceptedOffer.restaurantName
                    : `Livrare către ${getFirstName(acceptedOffer.customerName)}`}
                </Text>
              </View>
            </View>
            {acceptedOfferStage === "dropoff" ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleCallCustomer}
                style={({ pressed }) => [styles.activeSimulationCallButton, pressed && styles.activeSimulationCallButtonPressed]}
              >
                <Phone color={colors.text} size={16} strokeWidth={2.3} />
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={handleClearAcceptedOffer} style={styles.activeSimulationCloseButton}>
              <X color={colors.text} size={18} strokeWidth={2.4} />
            </Pressable>
          </View>

          <Text style={styles.activeSimulationBody} numberOfLines={1}>
            {acceptedOfferStage === "pickup" ? acceptedOffer.restaurantAddress : acceptedOffer.customerAddress}
          </Text>

          <Text style={styles.activeSimulationRouteLive}>
            {routeMetrics
              ? `${routeMetrics.durationMinutes} min • ${routeMetrics.distanceKm.toFixed(1)} km`
              : "Se calculează traseul..."}
          </Text>
        </View>
      ) : null}

    </View>
  );
}

function normalizeCoordinate(latitude?: string | number | null, longitude?: string | number | null): MapCoordinate | null {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
    return null;
  }

  return { latitude: lat, longitude: lng };
}

function normalizeHeading(value?: number | null) {
  const heading = Number(value);
  if (!Number.isFinite(heading) || heading < 0) {
    return null;
  }

  return heading % 360;
}

function buildCameraConfig(
  current: MapCoordinate | null,
  target: MapCoordinate | null,
  restaurants: RestaurantMapPin[],
  routeStops: MapCoordinate[] = [],
  shouldFitRoute = false,
) {
  if (current && shouldFitRoute && routeStops.length > 0) {
    const routePoints = [current, ...routeStops];
    const latitudes = routePoints.map((point) => point.latitude);
    const longitudes = routePoints.map((point) => point.longitude);

    return {
      bounds: {
        ne: [Math.max(...longitudes) + 0.004, Math.max(...latitudes) + 0.004],
        sw: [Math.min(...longitudes) - 0.004, Math.min(...latitudes) - 0.004],
      },
      padding: {
        paddingTop: 140,
        paddingRight: 40,
        paddingBottom: 220,
        paddingLeft: 40,
      },
      pitch: 0,
    };
  }

  if (current && target) {
    return {
      centerCoordinate: [current.longitude, current.latitude],
      zoomLevel: NAVIGATION_CAMERA_ZOOM,
      pitch: NAVIGATION_CAMERA_PITCH,
      heading: current.heading ?? 0,
    };
  }

  if (!target && restaurants.length) {
    const latitudes = restaurants.map((restaurant) => restaurant.coordinate.latitude);
    const longitudes = restaurants.map((restaurant) => restaurant.coordinate.longitude);

    return {
      bounds: {
        ne: [Math.max(...longitudes) + 0.006, Math.max(...latitudes) + 0.004],
        sw: [Math.min(...longitudes) - 0.006, Math.min(...latitudes) - 0.004],
      },
      padding: {
        paddingTop: 120,
        paddingRight: 36,
        paddingBottom: 120,
        paddingLeft: 36,
      },
      pitch: 0,
    };
  }

  if (current) {
    return {
      centerCoordinate: [current.longitude, current.latitude],
      zoomLevel: 15.2,
      pitch: 0,
    };
  }

  if (target) {
    return {
      centerCoordinate: [target.longitude, target.latitude],
      zoomLevel: 14.2,
      pitch: 0,
    };
  }

  return {
    centerCoordinate: [28.8004, 45.1798],
    zoomLevel: 13.2,
    pitch: 0,
  };
}

function buildRouteShape(coordinates: number[][]): GeoJSON.Feature<GeoJSON.LineString> | null {
  if (coordinates.length < 2) {
    return null;
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

function buildFallbackRouteMetrics(from: MapCoordinate, stops: MapCoordinate[]): RouteMetrics {
  const routePoints = [from, ...stops];
  let distanceKm = 0;

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    distanceKm += calculateDistanceKm(routePoints[index], routePoints[index + 1]);
  }

  return {
    distanceKm,
    durationMinutes: Math.max(6, Math.round(distanceKm * 2.4)),
  };
}

async function fetchMapboxRoute(
  from: MapCoordinate,
  stops: MapCoordinate[],
  accessToken: string,
  signal: AbortSignal,
) {
  const coordinates = [
    `${from.longitude},${from.latitude}`,
    ...stops.map((stop) => `${stop.longitude},${stop.latitude}`),
  ].join(";");
  const params = new URLSearchParams({
    access_token: accessToken,
    alternatives: "false",
    geometries: "geojson",
    overview: "full",
    steps: "false",
  });
  const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Mapbox directions failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    routes?: Array<{
      distance?: number;
      duration?: number;
      geometry?: {
        coordinates?: number[][];
      };
    }>;
  };
  const route = data.routes?.[0];
  const routeCoordinates = route?.geometry?.coordinates;

  if (!route || !routeCoordinates || routeCoordinates.length < 2) {
    throw new Error("Mapbox directions returned no route geometry.");
  }

  return {
    coordinates: routeCoordinates,
    distanceMeters: route.distance ?? 0,
    durationSeconds: route.duration ?? 0,
  };
}

function buildDistanceLabel(from: MapCoordinate | null, to: MapCoordinate) {
  if (!from) {
    return "7-8 km radius";
  }

  const distance = calculateDistanceKm(from, to);
  return `${distance.toFixed(1)} km away`;
}

function buildEtaLabel(from: MapCoordinate | null, to: MapCoordinate) {
  if (!from) {
    return "18-24 min";
  }

  const distance = calculateDistanceKm(from, to);
  const etaMinutes = Math.max(6, Math.round(distance * 2.4));
  return `${etaMinutes} min`;
}

function calculateDistanceKm(from: MapCoordinate, to: MapCoordinate) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversineValue =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);
  const arc = 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));
  return earthRadiusKm * arc;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function buildSimulatedOffer(restaurant: RestaurantMapPin, current: MapCoordinate): SimulatedOffer {
  const stop = SIMULATED_CUSTOMER_STOPS[restaurant.id];
  const pickupDistanceKm = calculateDistanceKm(current, restaurant.coordinate);
  const dropoffDistanceKm = calculateDistanceKm(restaurant.coordinate, stop.coordinate);
  const totalDistanceKm = pickupDistanceKm + dropoffDistanceKm;
  const pickupEtaMinutes = Math.max(3, Math.round(pickupDistanceKm * 2.4));
  const dropoffEtaMinutes = Math.max(5, Math.round(dropoffDistanceKm * 2.6));
  return {
    id: `sim-${restaurant.id}`,
    orderCode: buildOrderCode(restaurant.id),
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    restaurantImageUrl: restaurant.imageUrl,
    restaurantCoordinate: restaurant.coordinate,
    payoutLabel: stop.payoutLabel,
    restaurantPhone: stop.restaurantPhone,
    restaurantNote: stop.restaurantNote,
    customerName: stop.customerName,
    customerPhone: stop.customerPhone,
    customerAddress: stop.customerAddress,
    customerCoordinate: stop.coordinate,
    itemsSummary: stop.itemsSummary,
    items: stop.items,
    itemCount: stop.itemCount,
    pickupDistanceKm,
    pickupEtaMinutes,
    dropoffDistanceKm,
    dropoffEtaMinutes,
    totalDistanceKm,
    totalEtaMinutes: pickupEtaMinutes + dropoffEtaMinutes,
  };
}

function buildOrderCode(restaurantId: string) {
  let seed = 0;
  for (let index = 0; index < restaurantId.length; index += 1) {
    seed = (seed * 33 + restaurantId.charCodeAt(index)) % 1000000;
  }

  return seed.toString().padStart(6, "0");
}

function formatCurrency(value: number) {
  return `${value.toFixed(2).replace(".", ",")} RON`;
}

function getFirstName(value: string) {
  return value.trim().split(/\s+/)[0] ?? value;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  recenterButton: {
    position: "absolute",
    top: 68,
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111111",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 10,
  },
  recenterButtonDisabled: {
    opacity: 0.45,
  },
  recenterButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  fallback: {
    flex: 1,
    backgroundColor: "#DDE7CC",
    padding: 20,
    justifyContent: "center",
  },
  fallbackPanel: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.14)",
    padding: 20,
    gap: 8,
  },
  fallbackEyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  fallbackTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  fallbackBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  liveMarkerContainer: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  liveMarkerDirection: {
    width: 32,
    height: 40,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  liveMarkerArrowOutline: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 22,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: colors.white,
  },
  liveMarkerArrowFill: {
    position: "absolute",
    top: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: colors.text,
  },
  liveMarkerBase: {
    position: "absolute",
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111111",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  liveMarkerBaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  dropoffMarkerWrap: {
    alignItems: "center",
    gap: 0,
  },
  dropoffMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F97316",
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111111",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dropoffMarkerTail: {
    marginTop: -2,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#F97316",
  },
  restaurantMarkerPressable: {
    alignItems: "center",
  },
  restaurantMarkerWrap: {
    alignItems: "center",
    gap: 4,
  },
  restaurantMarkerLabel: {
    maxWidth: 172,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    shadowColor: "#111111",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  restaurantMarkerLabelSelected: {
    backgroundColor: colors.cardSelected,
    borderColor: "rgba(17,17,17,0.14)",
  },
  restaurantMarkerLabelText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  restaurantMarkerPinStack: {
    alignItems: "center",
  },
  restaurantMarkerStem: {
    width: 2,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(17,17,17,0.18)",
    marginBottom: -6,
  },
  restaurantMarkerPin: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#FF7A59",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111111",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    transform: [{ rotate: "45deg" }],
  },
  restaurantMarkerPinSelected: {
    transform: [{ rotate: "45deg" }, { scale: 1.08 }],
  },
  restaurantMarkerPinQueued: {
    backgroundColor: colors.lime,
  },
  restaurantMarkerPulseHalo: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(184,242,109,0.55)",
  },
  restaurantMarkerPinCore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(17,17,17,0.16)",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-45deg" }],
  },
  queueSheetWrap: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 20,
  },
  queueSheet: {
    paddingTop: 4,
    paddingBottom: 18,
    gap: 18,
  },
  queueSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 18,
  },
  queueSheetAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F5F5F4",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.06)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  queueSheetAvatarImage: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  queueSheetHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  queueSheetTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  queueSheetSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  queueSheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  queueSheetPayoutInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  queueSheetTitleDash: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 24,
  },
  queueSheetPayoutInlineText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  queueActions: {
    flexDirection: "row",
  },
  queuePrimaryAction: {
    flex: 1,
    borderRadius: 0,
  },
  queueSimulationPanel: {
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  queueSimulationButton: {
    minHeight: 52,
  },
  queueFeedbackMessage: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  pickupAutoSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "76%",
    paddingTop: 10,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 0,
    shadowColor: "#111111",
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 18,
    zIndex: 18,
  },
  pickupAutoSheetScroll: {
    flexGrow: 0,
  },
  pickupAutoSheetScrollContent: {
    paddingBottom: 28,
  },
  pickupSheetHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  pickupSheetAvatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#F5F5F4",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.06)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pickupSheetAvatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  pickupSheetHeroCopy: {
    flex: 1,
    gap: 5,
  },
  pickupSheetRestaurantName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  pickupSheetAddress: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },
  pickupSheetIconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupSheetIconButtonPressed: {
    opacity: 0.82,
  },
  pickupDetailsPanel: {
    gap: 18,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  pickupSectionDivider: {
    height: 1,
    backgroundColor: "rgba(17,17,17,0.08)",
  },
  pickupSheetInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  pickupSheetInfoBlock: {
    gap: 8,
  },
  pickupSheetInfoLabel: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "500",
  },
  pickupSheetOrderCodeValue: {
    color: "#F97316",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  pickupSheetInfoAside: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 2,
  },
  pickupSheetProductCount: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
  },
  pickupDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pickupDetailsTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  pickupItemsList: {
    gap: 12,
  },
  pickupItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickupItemThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  pickupItemCopy: {
    flex: 1,
  },
  pickupItemText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  pickupItemQtyBadge: {
    minWidth: 42,
    height: 42,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#F5F5F4",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupItemQtyText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  pickupItemPrice: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
  },
  pickupNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickupNoteTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  pickupNoteBody: {
    marginTop: -10,
    color: "#374151",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
  pickupPrimaryButton: {
    marginTop: 2,
    alignSelf: "stretch",
    borderRadius: 0,
    marginHorizontal: -18,
    marginBottom: -10,
  },
  nativeHandleIndicator: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(17,17,17,0.14)",
  },
  nativeSheetBackground: {
    backgroundColor: "rgba(247,248,242,0.98)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.1)",
  },
  activeSimulationCard: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 88,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 0,
    gap: 10,
    shadowColor: "#111111",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 14,
  },
  activeSimulationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activeSimulationStatusWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activeSimulationStatusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  activeSimulationStatusCopy: {
    flex: 1,
  },
  activeSimulationEyebrow: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  activeSimulationTitle: {
    color: colors.text,
    marginTop: 1,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  activeSimulationBody: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  activeSimulationCallButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F3EE",
  },
  activeSimulationCallButtonPressed: {
    opacity: 0.82,
  },
  activeSimulationProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeSimulationProgressStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeSimulationProgressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(17,17,17,0.12)",
  },
  activeSimulationProgressDotActive: {
    backgroundColor: colors.lime,
  },
  activeSimulationProgressDotComplete: {
    backgroundColor: "#F12400",
  },
  activeSimulationProgressLine: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(17,17,17,0.12)",
  },
  activeSimulationProgressLineComplete: {
    backgroundColor: "#F12400",
  },
  activeSimulationProgressLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  activeSimulationRouteLive: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  activeSimulationPickupButton: {
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: "#F12400",
    alignItems: "center",
    justifyContent: "center",
  },
  activeSimulationPickupButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  pickupSheetButton: {
    marginTop: 4,
    minHeight: 48,
  },
  activeSimulationPickupButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  activeSimulationCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F3EE",
  },
  offerSheetWrap: {
    paddingHorizontal: 0,
    paddingBottom: 18,
  },
  offerModalCard: {
    backgroundColor: colors.surface,
    paddingTop: 18,
    paddingHorizontal: 24,
    paddingBottom: 18,
    gap: 20,
  },
  offerSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  offerSummaryTitleBlock: {
    flex: 1,
  },
  offerSummaryCopy: {
    gap: 4,
  },
  offerDeliveryTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  offerRestaurantName: {
    marginTop: 2,
    color: colors.text,
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  offerMetaText: {
    marginTop: 8,
    color: "rgba(17,17,17,0.58)",
    fontSize: 15,
    fontWeight: "500",
  },
  offerCustomerAddress: {
    marginTop: 12,
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  offerCustomerEta: {
    marginTop: 4,
    color: "rgba(17,17,17,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
  offerCountdownBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  offerCountdownText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  offerPriceBlock: {
    borderTopWidth: 1,
    borderTopColor: "rgba(17,17,17,0.08)",
    paddingTop: 22,
    alignItems: "center",
    gap: 6,
  },
  offerPriceValue: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  offerAcceptButton: {
    alignSelf: "stretch",
    borderRadius: 0,
    marginHorizontal: -24,
    marginBottom: -18,
  },
  offerDeclineFloatingButton: {
    position: "absolute",
    top: 76,
    left: 18,
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111111",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 16,
  },
  offerDeclineFloatingButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  offerDeclineFloatingButtonText: {
    color: "#F12400",
    fontSize: 14,
    fontWeight: "600",
  },
});
