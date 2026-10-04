"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Same dark basemap as the desktop app (apps/setup/src/renderer/home.js).
const TILE_BASE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const TILE_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

export type MapTrail = {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
};

/**
 * Dark, chrome-less map that keeps `lat`/`lng` under a fixed screen point
 * (`focusY` px from the top), so a pin drawn over it stays put while the map
 * moves underneath — like the iOS app. A far move flies (zooms out, then in)
 * over `flyDuration` seconds, which is what makes the pin look like it travels.
 */
export default function OnboardingAppMap({
  lat,
  lng,
  zoom,
  focusY,
  flyDuration = 1.1,
  trail = null,
  onSelect,
}: {
  lat: number;
  lng: number;
  zoom: number;
  focusY: number;
  /** Seconds for a far move (the "teleport" flight). */
  flyDuration?: number;
  /** Dashed line from the visitor's real position to the destination. */
  trail?: MapTrail | null;
  onSelect: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const trailRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer(TILE_BASE, { maxZoom: 19, maxNativeZoom: 16 }).addTo(map);
    L.tileLayer(TILE_LABELS, { maxZoom: 19, maxNativeZoom: 16 }).addTo(map);

    map.on("click", (event) => {
      onSelectRef.current(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      // Stop a flight in progress first: Leaflet keeps animating a removed
      // map otherwise ("Cannot read properties of undefined (reading 'classList')").
      map.stop();
      map.remove();
      mapRef.current = null;
      trailRef.current = null;
    };
    // Created once; position updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.invalidateSize();
    const size = map.getSize();
    const point = map
      .project([lat, lng], zoom)
      .add([0, size.y / 2 - focusY]);
    const center = map.unproject(point, zoom);
    const far = map.getCenter().distanceTo(center) > 50_000;

    if (far) {
      map.flyTo(center, zoom, { duration: flyDuration });
    } else if (map.getZoom() === zoom) {
      map.panTo(center, { animate: true, duration: 0.5 });
    } else {
      map.flyTo(center, zoom, { duration: 1.1 });
    }
  }, [lat, lng, zoom, focusY, flyDuration]);

  const fromLat = trail?.from.lat;
  const fromLng = trail?.from.lng;
  const toLat = trail?.to.lat;
  const toLng = trail?.to.lng;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    trailRef.current?.remove();
    trailRef.current = null;
    if (fromLat === undefined || fromLng === undefined || toLat === undefined || toLng === undefined) {
      return;
    }

    trailRef.current = L.layerGroup([
      L.polyline(
        [
          [fromLat, fromLng],
          [toLat, toLng],
        ],
        { color: "#F472B6", weight: 2.5, opacity: 0.85, dashArray: "6 8", interactive: false }
      ),
      // Where the visitor really is.
      L.circleMarker([fromLat, fromLng], {
        radius: 6,
        color: "#FFFFFF",
        weight: 2,
        fillColor: "#3B82F6",
        fillOpacity: 1,
        interactive: false,
      }),
    ]).addTo(map);
  }, [fromLat, fromLng, toLat, toLng]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full [&.leaflet-container]:bg-[#1b1b1f] [&.leaflet-container]:font-[inherit] [&_.leaflet-tile-pane]:brightness-[1.35]"
    />
  );
}
