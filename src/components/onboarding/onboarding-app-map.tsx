"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Same dark basemap as the desktop app (apps/setup/src/renderer/home.js).
const TILE_BASE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const TILE_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

const DEFAULT_CENTER: L.LatLngTuple = [48.8566, 2.3522];
const DEFAULT_ZOOM = 12;
const FOCUS_ZOOM = 15;

// Gradient teardrop pin, same as GradientPin in apps/ios/Anyloc/HomeComponents.swift.
const PIN_ICON = L.divIcon({
  className: "app-pin-icon",
  html: `<div class="app-pin"><span class="app-pin__glow"></span><span class="app-pin__drop"><span class="app-pin__dot"></span></span></div>`,
  iconSize: [56, 46],
  iconAnchor: [28, 40],
});

export type MapPoint = { lat: number; lng: number };

/**
 * Dark, chrome-less map like the iOS app. The selected point is framed at
 * `focusY` px from the top so it stays in the part not covered by the
 * floating UI. `recenterKey` re-frames the selection on demand.
 */
export default function OnboardingAppMap({
  selected,
  focusY,
  recenterKey,
  onTap,
  onReady,
}: {
  selected: MapPoint | null;
  focusY: number;
  recenterKey: number;
  onTap: (point: MapPoint) => void;
  /** Called once the first tiles are on screen. */
  onReady?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onTapRef = useRef(onTap);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onTapRef.current = onTap;
    onReadyRef.current = onReady;
  }, [onTap, onReady]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    });

    const base = L.tileLayer(TILE_BASE, { maxZoom: 19, maxNativeZoom: 16 }).addTo(map);
    L.tileLayer(TILE_LABELS, { maxZoom: 19, maxNativeZoom: 16 }).addTo(map);

    // Don't wait forever on a slow network: show whatever has loaded.
    let ready = false;
    const markReady = () => {
      if (!ready) {
        ready = true;
        onReadyRef.current?.();
      }
    };
    base.once("load", markReady);
    const readyTimeout = window.setTimeout(markReady, 1500);

    map.on("click", (event) => {
      onTapRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    mapRef.current = map;

    return () => {
      window.clearTimeout(readyTimeout);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const lat = selected?.lat;
  const lng = selected?.lng;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (lat === undefined || lng === undefined) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    // Re-create the marker so the drop animation replays on every selection.
    markerRef.current?.remove();
    markerRef.current = L.marker([lat, lng], { icon: PIN_ICON, interactive: false }).addTo(map);

    map.invalidateSize();
    const zoom = Math.max(map.getZoom(), FOCUS_ZOOM);
    const size = map.getSize();
    const point = map.project([lat, lng], zoom).add([0, size.y / 2 - focusY]);
    const center = map.unproject(point, zoom);
    const far = map.getCenter().distanceTo(center) > 50_000;

    if (far || map.getZoom() !== zoom) {
      map.flyTo(center, zoom, { duration: far ? 1.4 : 0.6 });
    } else {
      map.panTo(center, { animate: true, duration: 0.4 });
    }
  }, [lat, lng, focusY, recenterKey]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full [&.leaflet-container]:bg-[#1b1b1f] [&.leaflet-container]:font-[inherit] [&_.leaflet-tile-pane]:brightness-[1.35]"
    />
  );
}
