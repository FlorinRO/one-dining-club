import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useVideoPlayer } from "expo-video";
import { Banknote, Bell, Check, LocateFixed, MapPinned, Store, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import Svg, { Path } from "react-native-svg";

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
  coordinate: MapCoordinate;
  cuisine: string;
  queueOrders: number;
  payoutRange: string;
};

type SimulatedOffer = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantCoordinate: MapCoordinate;
  payoutLabel: string;
  customerName: string;
  customerAddress: string;
  customerCoordinate: MapCoordinate;
  itemsSummary: string;
  travelDistanceKm: number;
  etaMinutes: number;
};

type RouteMetrics = {
  distanceKm: number;
  durationMinutes: number;
};

type Props = {
  currentLatitude?: string | number | null;
  currentLongitude?: string | number | null;
  targetLatitude?: string | number | null;
  targetLongitude?: string | number | null;
};

const TULCEA_RESTAURANT_PINS: RestaurantMapPin[] = [
  { id: "tulcea-bistro-delta", name: "Bistro Delta", coordinate: { latitude: 45.1794, longitude: 28.8012 }, cuisine: "Bistro", queueOrders: 2, payoutRange: "22-34 lei" },
  { id: "tulcea-casa-portului", name: "Casa Portului", coordinate: { latitude: 45.1808, longitude: 28.8046 }, cuisine: "Seafood", queueOrders: 3, payoutRange: "24-38 lei" },
  { id: "tulcea-danube-grill", name: "Danube Grill", coordinate: { latitude: 45.1769, longitude: 28.7928 }, cuisine: "Grill", queueOrders: 1, payoutRange: "18-27 lei" },
  { id: "tulcea-faleza-fish-house", name: "Faleza Fish House", coordinate: { latitude: 45.1835, longitude: 28.8081 }, cuisine: "Fish", queueOrders: 4, payoutRange: "26-42 lei" },
  { id: "tulcea-piata-veche-kitchen", name: "Piata Veche Kitchen", coordinate: { latitude: 45.1782, longitude: 28.7965 }, cuisine: "Comfort Food", queueOrders: 2, payoutRange: "20-31 lei" },
  { id: "tulcea-riverside-burger", name: "Riverside Burger", coordinate: { latitude: 45.1776, longitude: 28.7921 }, cuisine: "Burgers", queueOrders: 3, payoutRange: "21-33 lei" },
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
const QQ_ENABLE_HAPTIC_DURATION = 12;
const QQ_ENABLE_HAPTIC_GAP_MS = 90;
const QQ_DISABLE_HAPTIC_DURATION = 12;
const QQ_ORDER_ALERT_VIBRATION_PATTERN = [0, 160, 120, 160];
const SIMULATED_OFFER_DELAY_MS = 4000;
const QQ_ORDER_ALERT_SOUND = require("../../assets/qq-order-alert.wav");
const SIMULATED_CUSTOMER_STOPS: Record<
  string,
  { customerName: string; customerAddress: string; coordinate: MapCoordinate; itemsSummary: string; payoutLabel: string }
> = {
  "tulcea-bistro-delta": {
    customerName: "Ana Popescu",
    customerAddress: "Str. Isaccei 41, Tulcea",
    coordinate: { latitude: 45.1732, longitude: 28.7909 },
    itemsSummary: "2x burger menu, 1x lemonade",
    payoutLabel: "28 lei",
  },
  "tulcea-casa-portului": {
    customerName: "Radu Ionescu",
    customerAddress: "Str. Babadag 87, Tulcea",
    coordinate: { latitude: 45.1715, longitude: 28.8068 },
    itemsSummary: "1x fish soup, 1x grilled dorada",
    payoutLabel: "33 lei",
  },
  "tulcea-danube-grill": {
    customerName: "Mihai Enache",
    customerAddress: "Str. Garii 12, Tulcea",
    coordinate: { latitude: 45.1822, longitude: 28.7867 },
    itemsSummary: "2x mici menu, 1x fries",
    payoutLabel: "24 lei",
  },
  "tulcea-faleza-fish-house": {
    customerName: "Ioana Marin",
    customerAddress: "Str. Mahmudiei 19, Tulcea",
    coordinate: { latitude: 45.1881, longitude: 28.8152 },
    itemsSummary: "1x seafood platter, 2x water",
    payoutLabel: "36 lei",
  },
  "tulcea-piata-veche-kitchen": {
    customerName: "Carmen Stoica",
    customerAddress: "Str. Pacii 65, Tulcea",
    coordinate: { latitude: 45.1751, longitude: 28.8011 },
    itemsSummary: "1x pasta, 1x salad",
    payoutLabel: "26 lei",
  },
  "tulcea-riverside-burger": {
    customerName: "Alex Dobre",
    customerAddress: "Str. 1848 23, Tulcea",
    coordinate: { latitude: 45.1811, longitude: 28.7879 },
    itemsSummary: "2x smash burger, 1x cola",
    payoutLabel: "29 lei",
  },
};

export function CourierLiveMap({
  currentLatitude,
  currentLongitude,
  targetLatitude,
  targetLongitude,
}: Props) {
  const cameraRef = useRef<any>(null);
  const [deviceCoordinate, setDeviceCoordinate] = useState<MapCoordinate | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [queuedRestaurantIds, setQueuedRestaurantIds] = useState<string[]>([]);
  const [pendingOffer, setPendingOffer] = useState<SimulatedOffer | null>(null);
  const [acceptedOffer, setAcceptedOffer] = useState<SimulatedOffer | null>(null);
  const [queueFeedbackMessage, setQueueFeedbackMessage] = useState<string | null>(null);
  const [routeShape, setRouteShape] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const bottomSheetModalRef = useRef<BottomSheetModal | null>(null);
  const hapticTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const simulatedOfferTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedMarkerPulse = useRef(new Animated.Value(0)).current;
  const queuedSheetPulse = useRef(new Animated.Value(0)).current;
  const alertPlayer = useVideoPlayer(QQ_ORDER_ALERT_SOUND, (player) => {
    player.muted = false;
    player.volume = 1;
    player.loop = false;
  });
  const current = deviceCoordinate ?? normalizeCoordinate(currentLatitude, currentLongitude);
  const target = normalizeCoordinate(targetLatitude, targetLongitude);
  const effectiveTarget = target ?? acceptedOffer?.restaurantCoordinate ?? null;
  const isNavigationActive = Boolean(current && effectiveTarget);
  const restaurantPins = useMemo(() => TULCEA_RESTAURANT_PINS, []);
  const snapPoints = useMemo(() => ["32%"], []);
  const cameraConfig = useMemo(() => buildCameraConfig(current, effectiveTarget, restaurantPins), [current, effectiveTarget, restaurantPins]);
  const selectedRestaurant = useMemo(
    () => restaurantPins.find((restaurant) => restaurant.id === selectedRestaurantId) ?? null,
    [restaurantPins, selectedRestaurantId],
  );
  const isSelectedRestaurantQueued = selectedRestaurant ? queuedRestaurantIds.includes(selectedRestaurant.id) : false;

  useEffect(() => {
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          return;
        }

        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (mounted) {
          setDeviceCoordinate({
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
            heading: normalizeHeading(initial.coords.heading),
          });
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 4000,
            distanceInterval: 8,
          },
          (position) => {
            if (!mounted) {
              return;
            }

            setDeviceCoordinate({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              heading: normalizeHeading(position.coords.heading),
            });
          },
        );
      } catch {
        // Keep the map usable with backend coordinates if live GPS is unavailable.
      }
    };

    void startWatching();

    return () => {
      mounted = false;
      subscription?.remove();
      hapticTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      hapticTimeoutsRef.current = [];
      if (simulatedOfferTimeoutRef.current) {
        clearTimeout(simulatedOfferTimeoutRef.current);
        simulatedOfferTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!current || !effectiveTarget) {
      setRouteShape(null);
      setRouteMetrics(null);
      return;
    }

    const fallbackMetrics = buildFallbackRouteMetrics(current, effectiveTarget);
    setRouteShape(buildFallbackRouteShape(current, effectiveTarget));
    setRouteMetrics(fallbackMetrics);

    if (!MAPBOX_TOKEN) {
      return;
    }

    const abortController = new AbortController();

    const loadRoute = async () => {
      try {
        const route = await fetchMapboxRoute(current, effectiveTarget, MAPBOX_TOKEN, abortController.signal);
        setRouteShape(buildRouteShape(route.coordinates));
        setRouteMetrics({
          distanceKm: route.distanceMeters / 1000,
          durationMinutes: Math.max(1, Math.round(route.durationSeconds / 60)),
        });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setRouteShape(buildFallbackRouteShape(current, effectiveTarget));
        setRouteMetrics(fallbackMetrics);
      }
    };

    void loadRoute();

    return () => {
      abortController.abort();
    };
  }, [current, effectiveTarget]);

  useEffect(() => {
    if (!current || !effectiveTarget) {
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
  }, [current, effectiveTarget]);

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

  useEffect(() => {
    if (effectiveTarget) {
      bottomSheetModalRef.current?.dismiss();
      setSelectedRestaurantId(null);
    }
  }, [effectiveTarget]);

  useEffect(() => {
    if (!isSelectedRestaurantQueued) {
      queuedSheetPulse.stopAnimation();
      queuedSheetPulse.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(queuedSheetPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(queuedSheetPulse, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
      queuedSheetPulse.stopAnimation();
    };
  }, [isSelectedRestaurantQueued, queuedSheetPulse]);

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
    setSelectedRestaurantId(null);
  }, []);

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) {
      setSelectedRestaurantId(null);
    }
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.18}
        pressBehavior="close"
      />
    ),
    [],
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
    Vibration.vibrate(QQ_ORDER_ALERT_VIBRATION_PATTERN);
    try {
      alertPlayer.currentTime = 0;
      alertPlayer.play();
    } catch {
      // Dacă player-ul nu este pregătit încă, păstrăm fallback-ul prin notificare locală.
    }
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
  }, [alertPlayer]);

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
    setPendingOffer(null);
    setQueueFeedbackMessage("Oferta simulată a fost refuzată.");
  }, []);

  const handleAcceptOffer = useCallback(() => {
    if (!pendingOffer) {
      return;
    }

    setAcceptedOffer(pendingOffer);
    setPendingOffer(null);
    setQueueFeedbackMessage("Comanda simulată a fost acceptată. Traseul către restaurant este afișat pe hartă.");
    bottomSheetModalRef.current?.dismiss();
    setSelectedRestaurantId(null);
  }, [pendingOffer]);

  const handleClearAcceptedOffer = useCallback(() => {
    setAcceptedOffer(null);
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

  const animatedQueuedSheetStyle = {
    shadowOpacity: queuedSheetPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.04, 0.5],
    }),
    shadowRadius: queuedSheetPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 72],
    }),
  };

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
          <MarkerView coordinate={[current.longitude, current.latitude]} anchor={{ x: 0.5, y: 0.5 }}>
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

        {target ? (
          <MarkerView coordinate={[target.longitude, target.latitude]} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.dropoffMarker}>
              <View style={styles.dropoffMarkerDot} />
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

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture={false}
        enableOverDrag={false}
        overDragResistanceFactor={1000}
        onChange={handleSheetChange}
        onDismiss={handleSheetDismiss}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.nativeHandleIndicator}
        backgroundStyle={styles.nativeSheetBackground}
      >
        {selectedRestaurant ? (
          <BottomSheetView style={styles.queueSheetWrap}>
            <Animated.View
              style={[
                styles.queueSheet,
                isSelectedRestaurantQueued && styles.queueSheetQueued,
                isSelectedRestaurantQueued && animatedQueuedSheetStyle,
              ]}
            >
                <View style={styles.queueSheetHeader}>
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
                    title={isSelectedRestaurantQueued ? "QQ activ" : "Activează QQ"}
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
              </Animated.View>
          </BottomSheetView>
        ) : (
          <BottomSheetView>
            <View />
          </BottomSheetView>
        )}
      </BottomSheetModal>

      {acceptedOffer && !target ? (
        <View style={styles.activeSimulationCard}>
          <View style={styles.activeSimulationCopy}>
            <Text style={styles.activeSimulationEyebrow}>Simulated order live</Text>
            <Text style={styles.activeSimulationTitle}>{acceptedOffer.restaurantName}</Text>
            <Text style={styles.activeSimulationBody}>
              {routeMetrics
                ? `${routeMetrics.distanceKm.toFixed(1)} km • ${routeMetrics.durationMinutes} min până la restaurant`
                : "Pickup la restaurant"}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={handleClearAcceptedOffer} style={styles.activeSimulationCloseButton}>
            <X color={colors.text} size={18} strokeWidth={2.4} />
          </Pressable>
        </View>
      ) : null}

      <Modal transparent animationType="fade" visible={Boolean(pendingOffer)} onRequestClose={handleDeclineOffer}>
        {pendingOffer ? (
          <View style={styles.offerModalBackdrop}>
            <View style={styles.offerModalShell}>
              <Svg style={styles.offerModalWaveTop} viewBox="0 0 100 18" preserveAspectRatio="none">
                <Path
                  d="M0 18 L0 10 C8 20 18 -2 30 10 C42 22 52 -2 64 10 C76 22 86 -2 96 10 C98 12 99 11 100 10 L100 18 Z"
                  fill={colors.surface}
                />
              </Svg>
              <View style={styles.offerModalCard}>
                <View style={styles.offerModalHeader}>
                  <View style={styles.offerModalIconWrap}>
                    <Bell color={colors.black} size={18} strokeWidth={2.4} />
                  </View>
                  <View style={styles.offerModalHeaderCopy}>
                    <Text style={styles.offerModalTitle}>Comandă nouă disponibilă</Text>
                  </View>
                </View>

                <View style={styles.offerModalSummaryCard}>
                  <Text style={styles.offerModalRestaurant}>{pendingOffer.restaurantName}</Text>
                  <Text style={styles.offerModalItems}>{pendingOffer.itemsSummary}</Text>
                </View>

                <View style={styles.offerMetaList}>
                  <View style={styles.offerMetaRow}>
                    <Text style={styles.offerMetaLabel}>Client</Text>
                    <Text style={styles.offerMetaValue}>{pendingOffer.customerName}</Text>
                  </View>
                  <View style={styles.offerMetaRow}>
                    <Text style={styles.offerMetaLabel}>Destinație</Text>
                    <Text style={styles.offerMetaValue}>{pendingOffer.customerAddress}</Text>
                  </View>
                  <View style={styles.offerMetaRow}>
                    <Text style={styles.offerMetaLabel}>Distanță</Text>
                    <Text style={styles.offerMetaValue}>{pendingOffer.travelDistanceKm.toFixed(1)} km</Text>
                  </View>
                  <View style={styles.offerMetaRow}>
                    <Text style={styles.offerMetaLabel}>ETA</Text>
                    <Text style={styles.offerMetaValue}>{pendingOffer.etaMinutes} min</Text>
                  </View>
                  <View style={styles.offerMetaRow}>
                    <Text style={styles.offerMetaLabel}>Câștig</Text>
                    <Text style={styles.offerMetaValue}>{pendingOffer.payoutLabel}</Text>
                  </View>
                </View>

                <View style={styles.offerActions}>
                  <PrimaryButton
                    onPress={handleDeclineOffer}
                    icon={<X color={colors.red} size={34} strokeWidth={3.4} />}
                    variant="ghost"
                    flatEdges
                    style={styles.offerActionButton}
                  />
                  <PrimaryButton
                    onPress={handleAcceptOffer}
                    icon={<Check color={colors.greenDark} size={36} strokeWidth={3.4} />}
                    variant="lime"
                    flatEdges
                    style={styles.offerActionButtonAccept}
                  />
                </View>
              </View>
              <Svg style={styles.offerModalWaveBottom} viewBox="0 0 100 18" preserveAspectRatio="none">
                <Path
                  d="M0 0 L0 8 C8 -2 18 24 30 8 C42 -2 52 24 64 8 C76 -2 86 24 96 8 C98 6 99 7 100 8 L100 0 Z"
                  fill={colors.surface}
                />
              </Svg>
            </View>
          </View>
        ) : null}
      </Modal>
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
) {
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

function buildFallbackRouteShape(from: MapCoordinate, to: MapCoordinate) {
  return buildRouteShape([
    [from.longitude, from.latitude],
    [to.longitude, to.latitude],
  ]);
}

function buildFallbackRouteMetrics(from: MapCoordinate, to: MapCoordinate): RouteMetrics {
  const distanceKm = calculateDistanceKm(from, to);
  return {
    distanceKm,
    durationMinutes: Math.max(6, Math.round(distanceKm * 2.4)),
  };
}

async function fetchMapboxRoute(
  from: MapCoordinate,
  to: MapCoordinate,
  accessToken: string,
  signal: AbortSignal,
) {
  const coordinates = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
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
  const travelDistanceKm = calculateDistanceKm(current, stop.coordinate);
  return {
    id: `sim-${restaurant.id}`,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantCoordinate: restaurant.coordinate,
    payoutLabel: stop.payoutLabel,
    customerName: stop.customerName,
    customerAddress: stop.customerAddress,
    customerCoordinate: stop.coordinate,
    itemsSummary: stop.itemsSummary,
    travelDistanceKm,
    etaMinutes: Math.max(6, Math.round(travelDistanceKm * 2.4)),
  };
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
  dropoffMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  dropoffMarkerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF8A65",
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
  queueSheetQueued: {
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  queueSheetHeader: {
    gap: 16,
    paddingHorizontal: 18,
  },
  queueSheetHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  queueSheetTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
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
    left: 18,
    right: 76,
    top: 68,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#111111",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  activeSimulationCopy: {
    flex: 1,
    gap: 2,
  },
  activeSimulationEyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  activeSimulationTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  activeSimulationBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  activeSimulationCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
  },
  offerModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,17,17,0.4)",
    justifyContent: "center",
  },
  offerModalShell: {
    width: "100%",
  },
  offerModalWaveTop: {
    width: "100%",
    height: 28,
  },
  offerModalCard: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
    gap: 18,
  },
  offerModalWaveBottom: {
    width: "100%",
    height: 28,
    marginTop: -1,
  },
  offerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  offerModalIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lime,
  },
  offerModalHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  offerModalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  offerModalSummaryCard: {
    padding: 16,
    borderRadius: 0,
    backgroundColor: colors.cardSoft,
    gap: 4,
    marginHorizontal: -20,
  },
  offerModalRestaurant: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  offerModalItems: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  offerMetaList: {
    gap: 10,
  },
  offerMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  offerMetaLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  offerMetaValue: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
  },
  offerActions: {
    flexDirection: "row",
    gap: 0,
    marginHorizontal: -20,
    marginTop: 2,
    marginBottom: -1,
  },
  offerActionButton: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 0,
    backgroundColor: colors.surface,
  },
  offerActionButtonAccept: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 0,
    backgroundColor: colors.surface,
  },
});
