export type SpoofedCoords = {
  lat: number;
  lng: number;
  accuracy: number;
};

type PositionCallbackSuccess = (position: GeolocationPosition) => void;
type PositionCallbackError = (error: GeolocationPositionError) => void;

function buildPosition(coords: SpoofedCoords): GeolocationPosition {
  return {
    coords: {
      latitude: coords.lat,
      longitude: coords.lng,
      accuracy: coords.accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON() {
        return this;
      },
    },
    timestamp: Date.now(),
    toJSON() {
      return this;
    },
  };
}

export function installGeolocationSpoof(
  getCoords: () => SpoofedCoords | null
) {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return () => {};
  }

  const geolocation = navigator.geolocation;
  const originalGetCurrentPosition =
    geolocation.getCurrentPosition.bind(geolocation);
  const originalWatchPosition = geolocation.watchPosition.bind(geolocation);
  const originalClearWatch = geolocation.clearWatch.bind(geolocation);

  const watchers = new Map<number, ReturnType<typeof setInterval>>();
  let watchId = 0;

  geolocation.getCurrentPosition = (
    success: PositionCallbackSuccess,
    error?: PositionCallbackError,
    _options?: PositionOptions
  ) => {
    const coords = getCoords();

    if (coords) {
      success(buildPosition(coords));
      return;
    }

    originalGetCurrentPosition(success, error, _options);
  };

  geolocation.watchPosition = (
    success: PositionCallbackSuccess,
    error?: PositionCallbackError,
    _options?: PositionOptions
  ) => {
    const id = watchId + 1;
    watchId = id;

    const tick = () => {
      const coords = getCoords();

      if (coords) {
        success(buildPosition(coords));
        return;
      }

      originalGetCurrentPosition(success, error, _options);
    };

    tick();
    watchers.set(id, setInterval(tick, 3000));

    return id;
  };

  geolocation.clearWatch = (id: number) => {
    const interval = watchers.get(id);

    if (interval) {
      clearInterval(interval);
      watchers.delete(id);
      return;
    }

    originalClearWatch(id);
  };

  return () => {
    geolocation.getCurrentPosition = originalGetCurrentPosition;
    geolocation.watchPosition = originalWatchPosition;
    geolocation.clearWatch = originalClearWatch;

    for (const interval of watchers.values()) {
      clearInterval(interval);
    }

    watchers.clear();
  };
}
