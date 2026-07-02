import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import courierMapStyle from "../../mapbox/yumzy-courier-style.json";
import { getMapboxAccessToken } from "../config/mapbox";
import { getMapboxModule } from "../lib/mapboxRuntime";
import { colors } from "../theme/colors";

type MapCoordinate = {
  latitude: number;
  longitude: number;
  heading?: number | null;
};

type Props = {
  currentLatitude?: string | number | null;
  currentLongitude?: string | number | null;
  targetLatitude?: string | number | null;
  targetLongitude?: string | number | null;
};

const BUCHAREST_COORDINATE = {
  latitude: 44.439663,
  longitude: 26.096306,
};

const MAPBOX_STYLE_JSON = JSON.stringify(courierMapStyle);
const MAPBOX_STYLE_KEY = `${courierMapStyle.name}-${courierMapStyle.layers.length}`;
const MAPBOX_TOKEN = getMapboxAccessToken();
const MAPBOX_MODULE = getMapboxModule();

export function CourierLiveMap({
  currentLatitude,
  currentLongitude,
  targetLatitude,
  targetLongitude,
}: Props) {
  const [deviceCoordinate, setDeviceCoordinate] = useState<MapCoordinate | null>(null);
  const current = deviceCoordinate ?? normalizeCoordinate(currentLatitude, currentLongitude);
  const target = normalizeCoordinate(targetLatitude, targetLongitude);
  const cameraConfig = useMemo(() => buildCameraConfig(current, target), [current, target]);
  const routeShape = useMemo(() => buildRouteShape(current, target), [current, target]);

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
    };
  }, []);

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
        <Camera animationMode="easeTo" animationDuration={900} defaultSettings={cameraConfig} {...cameraConfig} />

        {routeShape ? (
          <ShapeSource id="courier-route" shape={routeShape} lineMetrics>
            <LineLayer
              id="courier-route-line"
              style={{
                lineColor: colors.lime,
                lineWidth: 5,
                lineOpacity: 0.85,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </ShapeSource>
        ) : null}

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
) {
  if (current && target) {
    return {
      bounds: {
        ne: [Math.max(current.longitude, target.longitude), Math.max(current.latitude, target.latitude)],
        sw: [Math.min(current.longitude, target.longitude), Math.min(current.latitude, target.latitude)],
      },
      padding: {
        paddingTop: 120,
        paddingRight: 48,
        paddingBottom: 160,
        paddingLeft: 48,
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
    centerCoordinate: [BUCHAREST_COORDINATE.longitude, BUCHAREST_COORDINATE.latitude],
    zoomLevel: 11.8,
    pitch: 0,
  };
}

function buildRouteShape(
  current: MapCoordinate | null,
  target: MapCoordinate | null,
): GeoJSON.Feature<GeoJSON.LineString> | null {
  if (!current || !target) {
    return null;
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [current.longitude, current.latitude],
        [target.longitude, target.latitude],
      ],
    },
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
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
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
    width: 4,
    height: 4,
    borderRadius: 2,
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
});
