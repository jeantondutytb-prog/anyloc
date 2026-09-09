"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

interface Location {
  name: string;
  lat: number;
  lng: number;
}

function createPinIcon(active: boolean) {
  return L.divIcon({
    className: "map-pin-icon",
    html: `<div class="map-pin ${active ? "map-pin--active" : ""}"><span class="map-pin__dot"></span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

export default function LocationMap({
  selected,
  onSelect,
  active,
  fullScreen = false,
  layoutKey = 0,
}: {
  selected: Location;
  onSelect: (loc: Location) => void;
  active: boolean;
  fullScreen?: boolean;
  layoutKey?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const outerCircleRef = useRef<L.Circle | null>(null);
  const innerCircleRef = useRef<L.Circle | null>(null);
  const onSelectRef = useRef(onSelect);
  const hasCenteredRef = useRef(false);

  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: [selected.lat, selected.lng],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      subdomains: ["a", "b", "c"],
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker([selected.lat, selected.lng], {
      icon: createPinIcon(active),
      zIndexOffset: 1000,
    }).addTo(map);

    const outerCircle = L.circle([selected.lat, selected.lng], {
      radius: 500,
      color: "#ec4899",
      fillColor: "#f472b6",
      fillOpacity: 0.1,
      weight: 1.5,
      dashArray: "6 8",
    });

    const innerCircle = L.circle([selected.lat, selected.lng], {
      radius: 180,
      color: "#f9a8d4",
      fillColor: "#fbcfe8",
      fillOpacity: 0.15,
      weight: 1,
    });

    if (active) {
      outerCircle.addTo(map);
      innerCircle.addTo(map);
    }

    map.on("click", (event) => {
      onSelectRef.current({
        name: `${event.latlng.lat.toFixed(4)}, ${event.latlng.lng.toFixed(4)}`,
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    });

    mapRef.current = map;
    markerRef.current = marker;
    outerCircleRef.current = outerCircle;
    innerCircleRef.current = innerCircle;

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      outerCircleRef.current = null;
      innerCircleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const outerCircle = outerCircleRef.current;
    const innerCircle = innerCircleRef.current;

    if (!map || !marker || !outerCircle || !innerCircle) {
      return;
    }

    const position: L.LatLngExpression = [selected.lat, selected.lng];

    marker.setLatLng(position);
    marker.setIcon(createPinIcon(active));
    outerCircle.setLatLng(position);
    innerCircle.setLatLng(position);

    if (hasCenteredRef.current) {
      map.flyTo(position, Math.max(map.getZoom(), 11), { duration: 0.8 });
    } else {
      hasCenteredRef.current = true;
    }
  }, [selected.lat, selected.lng, active]);

  useEffect(() => {
    const map = mapRef.current;
    const outerCircle = outerCircleRef.current;
    const innerCircle = innerCircleRef.current;

    if (!map || !outerCircle || !innerCircle) {
      return;
    }

    if (active) {
      outerCircle.addTo(map);
      innerCircle.addTo(map);
      return;
    }

    outerCircle.remove();
    innerCircle.remove();
  }, [active]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const timeout = window.setTimeout(() => {
      map.invalidateSize();
    }, 320);

    return () => window.clearTimeout(timeout);
  }, [layoutKey, fullScreen]);

  return (
    <div
      className={
        fullScreen
          ? "simple-map-shell simple-map-shell--fullscreen h-full w-full"
          : "simple-map-shell h-[400px] w-full lg:h-[500px]"
      }
    >
      <div ref={containerRef} className="simple-map h-full w-full" />
    </div>
  );
}
