"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Same dark basemap as the desktop app (apps/setup/src/renderer/home.js).
const TILE_BASE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const TILE_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

/**
 * Dark, chrome-less map that keeps `lat`/`lng` under a fixed screen point
 * (`focusY` px from the top), so a pin drawn over it stays put while the map
 * moves underneath — like the iOS app.
 */
export default function OnboardingAppMap({
  lat,
  lng,
  zoom,
  focusY,
  onSelect,
}: {
  lat: number;
  lng: number;
  zoom: number;
  focusY: number;
  onSelect: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
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
      map.remove();
      mapRef.current = null;
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

    if (map.getZoom() === zoom) {
      map.panTo(center, { animate: true, duration: 0.5 });
    } else {
      map.flyTo(center, zoom, { duration: 1.1 });
    }
  }, [lat, lng, zoom, focusY]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full [&.leaflet-container]:bg-[#1b1b1f] [&.leaflet-container]:font-[inherit] [&_.leaflet-tile-pane]:brightness-[1.35]"
    />
  );
}
