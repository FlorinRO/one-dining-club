type MapboxModule = typeof import("@rnmapbox/maps");

let cachedModule: MapboxModule | null | undefined;

export function getMapboxModule(): MapboxModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  try {
    cachedModule = require("@rnmapbox/maps") as MapboxModule;
  } catch {
    cachedModule = null;
  }

  return cachedModule;
}
