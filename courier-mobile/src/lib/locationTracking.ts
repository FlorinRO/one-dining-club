import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { API_BASE_URL } from "../config/api";
import { useAuthStore } from "../store/authStore";

export const COURIER_LOCATION_TASK = "yumzy-courier-background-location";

type LocationTaskData = {
  locations?: Location.LocationObject[];
};

try {
  if (!TaskManager.isTaskDefined(COURIER_LOCATION_TASK)) {
    TaskManager.defineTask(COURIER_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        return;
      }

      const payload = data as LocationTaskData | undefined;
      const location = payload?.locations?.[0];
      const accessToken = useAuthStore.getState().accessToken;
      if (!location || !accessToken) {
        return;
      }

      try {
        await fetch(`${API_BASE_URL}/courier/location/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            current_latitude: location.coords.latitude.toFixed(6),
            current_longitude: location.coords.longitude.toFixed(6),
          }),
        });
      } catch {
        // Keep background tracking resilient; foreground refresh will recover state.
      }
    });
  }
} catch {
  // Some runtimes can throw during early task registration; foreground sync still works.
}

export async function requestCourierLocationPermissions() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    return { ok: false, backgroundGranted: false };
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  return {
    ok: true,
    backgroundGranted: background.status === "granted" || background.status === "undetermined",
  };
}

export async function startCourierBackgroundTracking() {
  const permission = await requestCourierLocationPermissions();
  if (!permission.ok) {
    return false;
  }

  const started = await Location.hasStartedLocationUpdatesAsync(COURIER_LOCATION_TASK);
  if (started) {
    return true;
  }

  await Location.startLocationUpdatesAsync(COURIER_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 60000,
    distanceInterval: 120,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: "YUMZY Courier",
      notificationBody: "Live location is active while you are online.",
    },
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
  });

  return true;
}

export async function stopCourierBackgroundTracking() {
  const started = await Location.hasStartedLocationUpdatesAsync(COURIER_LOCATION_TASK);
  if (!started) {
    return;
  }

  await Location.stopLocationUpdatesAsync(COURIER_LOCATION_TASK);
}

export async function isCourierBackgroundTrackingActive() {
  return Location.hasStartedLocationUpdatesAsync(COURIER_LOCATION_TASK);
}
