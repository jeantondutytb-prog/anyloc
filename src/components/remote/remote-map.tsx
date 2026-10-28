"use client";

import { useEffect, useRef } from "react";
import { preconnect } from "react-dom";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// MapLibre 6 looks for its worker next to its own file, which the bundler
// doesn't copy: point it at the bundled copy instead.
maplibregl.setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href
);

// OpenFreeMap: free vector tiles, no key. Recoloured below to sit closer to
// the iOS app's muted dark Apple map.
const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

/** Street-level view the camera settles on, tilted like the iOS app. */
const STREET_ZOOM = 15.6;
const STREET_PITCH = 50;
/** Height the landing descent starts from (hidden behind the teleport card). */
const LANDING_START_ZOOM = 11.5;
/** Far trips cut to this height above the destination, then descend. */
const ARRIVAL_START_ZOOM = 12.5;
/** Longest wait for the destination's tiles before moving anyway. */
const WARM_TIMEOUT_MS = 1500;
const FADE_MS = 180;

type Place = { name: string; lat: number; lng: number };

const LABEL_TEXT: maplibregl.ExpressionSpecification = [
  "coalesce",
  ["get", "name:latin"],
  ["get", "name"],
];

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const sleep = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Fetches the tiles around a place for every zoom the descent passes through,
 * so the browser cache already holds them when MapLibre asks: no black frames
 * while the camera moves. Resolves once loaded, or after `timeoutMs`.
 */
async function warmTiles(
  map: maplibregl.Map,
  lat: number,
  lng: number,
  timeoutMs = WARM_TIMEOUT_MS
) {
  const source = map.getSource("openmaptiles") as
    | maplibregl.VectorTileSource
    | undefined;
  const template = source?.tiles?.[0];
  if (!template) return;

  const urls: string[] = [];
  const latRad = (lat * Math.PI) / 180;
  for (let z = 10; z <= 14; z++) {
    const n = 2 ** z;
    const cx = Math.floor(((lng + 180) / 360) * n);
    const cy = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
        n
    );
    // The tilted camera looks north: take two extra rows towards the horizon.
    for (let dy = z >= 13 ? -3 : -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = (cx + dx + n) % n;
        const y = cy + dy;
        if (y < 0 || y >= n) continue;
        urls.push(
          template
            .replace("{z}", String(z))
            .replace("{x}", String(x))
            .replace("{y}", String(y))
        );
      }
    }
  }
  await Promise.race([
    Promise.allSettled(urls.map((url) => fetch(url))),
    sleep(timeoutMs),
  ]);
}
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

type PaintProperty = Parameters<maplibregl.Map["setPaintProperty"]>[1];

function paint(
  map: maplibregl.Map,
  id: string,
  prop: PaintProperty,
  value: string | number
) {
  // Each property has its own value type; these are plain colours/numbers.
  if (map.getLayer(id)) map.setPaintProperty(id, prop, value as never);
}

/** Lighter, slightly violet greys and readable latin labels. */
function restyle(map: maplibregl.Map) {
  paint(map, "background", "background-color", "#1a1a1e");
  paint(map, "water", "fill-color", "#0e131c");
  paint(map, "waterway", "line-color", "#0e131c");
  paint(map, "landuse_residential", "fill-color", "#1e1e23");
  paint(map, "landuse_park", "fill-color", "#16201a");
  paint(map, "landcover_wood", "fill-color", "#16201a");
  paint(map, "building", "fill-color", "#25252b");
  paint(map, "building", "fill-outline-color", "#2e2e35");
  paint(map, "highway_minor", "line-color", "#33333b");
  paint(map, "highway_path", "line-color", "#2b2b32");
  paint(map, "highway_major_casing", "line-color", "#121215");
  paint(map, "highway_major_inner", "line-color", "#41414b");
  paint(map, "highway_major_subtle", "line-color", "#41414b");
  paint(map, "highway_motorway_casing", "line-color", "#121215");
  paint(map, "highway_motorway_inner", "line-color", "#4c4658");
  paint(map, "highway_motorway_subtle", "line-color", "#4c4658");
  for (const id of ["road_oneway", "road_oneway_opposite"]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
  }

  for (const layer of map.getStyle().layers) {
    if (layer.type !== "symbol" || !("source-layer" in layer)) continue;
    const sourceLayer = layer["source-layer"];
    if (sourceLayer === "place") {
      map.setLayoutProperty(layer.id, "text-field", LABEL_TEXT);
      paint(map, layer.id, "text-color", "#c4c4ca");
      paint(map, layer.id, "text-halo-color", "rgba(10,10,12,0.85)");
    } else if (sourceLayer === "transportation_name") {
      map.setLayoutProperty(layer.id, "text-field", LABEL_TEXT);
      paint(map, layer.id, "text-color", "#8b8b94");
      paint(map, layer.id, "text-halo-color", "rgba(10,10,12,0.85)");
    } else if (sourceLayer === "water_name") {
      map.setLayoutProperty(layer.id, "text-field", LABEL_TEXT);
      paint(map, layer.id, "text-color", "#4d5d78");
      paint(map, layer.id, "text-halo-color", "rgba(10,10,12,0.6)");
    }
  }

  // 3D buildings under the labels, like the iOS app's realistic elevation.
  const firstSymbol = map
    .getStyle()
    .layers.find((layer) => layer.type === "symbol")?.id;
  if (!map.getLayer("building-3d")) {
    map.addLayer(
      {
        id: "building-3d",
        type: "fill-extrusion",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 14,
        paint: {
          "fill-extrusion-color": "#2c2c33",
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            0,
            15,
            ["coalesce", ["get", "render_height"], 0],
          ],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.9,
        },
      },
      firstSymbol
    );
  }
}

function createPinElement() {
  const el = document.createElement("div");
  el.className = "dark-pin";
  el.innerHTML =
    '<span class="dark-pin__glow"></span><span class="dark-pin__drop"><span class="dark-pin__dot"></span></span>';
  return el;
}

/**
 * Full-screen vector map of the iPhone remote (/app). The pin element is
 * created once and only moved, so it never re-renders mid-animation.
 */
export default function RemoteMap({
  place,
  showPin,
  active,
  onSelect,
  recenterKey,
  landingKey,
}: {
  place: Place;
  showPin: boolean;
  active: boolean;
  onSelect: (place: Place) => void;
  /** Bump to glide back to the current place. */
  recenterKey: number;
  /** Bump to play the descent onto the place (after a teleport). */
  landingKey: number;
}) {
  // Style, glyphs and tiles all come from there: open the connection early.
  preconnect("https://tiles.openfreemap.org", { crossOrigin: "anonymous" });

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const placeRef = useRef(place);
  const lastPinRef = useRef<string | null>(null);
  const mountedAtRef = useRef(0);

  useEffect(() => {
    onSelectRef.current = onSelect;
    placeRef.current = place;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const start = placeRef.current;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [start.lng, start.lat],
      zoom: STREET_ZOOM,
      pitch: STREET_PITCH,
      maxPitch: 60,
      dragRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
      fadeDuration: 200,
    });
    map.touchZoomRotate.disableRotation();
    map.on("style.load", () => restyle(map));
    // Keep the canvas matched to the container (Safari's toolbar resizes it).
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);
    map.on("click", (event) => {
      const { lat, lng } = event.lngLat;
      onSelectRef.current({
        name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
      });
    });

    const marker = new maplibregl.Marker({
      element: createPinElement(),
      anchor: "bottom",
    })
      .setLngLat([start.lng, start.lat])
      .addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    mountedAtRef.current = Date.now();

    return () => {
      resizeObserver.disconnect();
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Pin: move it, and replay the drop only when it lands somewhere new.
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const el = marker.getElement();
    marker.setLngLat([place.lng, place.lat]);
    el.classList.toggle("dark-pin--hidden", !showPin);
    el.classList.toggle("dark-pin--active", active);

    const key = `${place.lat},${place.lng}`;
    if (showPin && lastPinRef.current !== key) {
      lastPinRef.current = key;
      const drop = el.querySelector<HTMLElement>(".dark-pin__drop");
      drop?.classList.remove("dark-pin__drop--landing");
      void drop?.offsetWidth;
      drop?.classList.add("dark-pin__drop--landing");
    }
  }, [place.lat, place.lng, showPin, active]);

  // Camera follows the selection: a short glide nearby. Further away, a flight
  // would zoom out over tiles that aren't loaded (black frames), so instead the
  // destination is preloaded, then a quick fade cuts to it and the camera
  // descends, like the iOS app's landing.
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) return;
    const target: [number, number] = [place.lng, place.lat];
    // The saved position arriving right after load: no flight from the default.
    if (Date.now() - mountedAtRef.current < 1500) {
      map.jumpTo({ center: target });
      void warmTiles(map, place.lat, place.lng);
      return;
    }
    const far =
      map.getCenter().distanceTo(new maplibregl.LngLat(place.lng, place.lat)) >
      20_000;

    if (!far) {
      map.easeTo({
        center: target,
        zoom: Math.max(map.getZoom(), 13),
        pitch: STREET_PITCH,
        duration: 650,
        easing: easeOutCubic,
        essential: true,
      });
      // Ready for the landing descent after a teleport.
      void warmTiles(map, place.lat, place.lng);
      return;
    }

    let cancelled = false;
    void (async () => {
      await warmTiles(map, place.lat, place.lng);
      if (cancelled) return;
      container.style.opacity = "0";
      await sleep(FADE_MS);
      if (cancelled) return;
      map.jumpTo({ center: target, zoom: ARRIVAL_START_ZOOM, pitch: 20 });
      container.style.opacity = "1";
      map.easeTo({
        zoom: STREET_ZOOM,
        pitch: STREET_PITCH,
        duration: 1600,
        easing: easeOutCubic,
        essential: true,
      });
    })();
    return () => {
      cancelled = true;
      container.style.opacity = "1";
    };
  }, [place.lat, place.lng, recenterKey]);

  // Landing after a teleport: jump high above (hidden by the card), then descend.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || landingKey === 0) return;
    const { lat, lng } = placeRef.current;
    map.jumpTo({ center: [lng, lat], zoom: LANDING_START_ZOOM, pitch: 0 });
    map.easeTo({
      center: [lng, lat],
      zoom: STREET_ZOOM,
      pitch: STREET_PITCH,
      duration: 2800,
      easing: easeInOutCubic,
      essential: true,
    });
  }, [landingKey]);

  return (
    <div
      ref={containerRef}
      className="remote-map h-full w-full transition-opacity duration-[180ms] ease-out"
    />
  );
}
