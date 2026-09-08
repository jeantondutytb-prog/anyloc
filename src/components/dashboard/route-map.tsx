"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Waypoint } from "@/lib/route-simulation";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export default function RouteMap({
  waypoints,
  onAddWaypoint,
}: {
  waypoints: Waypoint[];
  onAddWaypoint: (waypoint: Waypoint) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const onAddRef = useRef(onAddWaypoint);

  onAddRef.current = onAddWaypoint;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: [36.4848, -4.9526],
      zoom: 5,
    });

    L.tileLayer(TILE_URL, {
      subdomains: ["a", "b", "c"],
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const markers = L.layerGroup().addTo(map);
    const polyline = L.polyline([], { color: "#ec4899", weight: 4 }).addTo(map);

    map.on("click", (event) => {
      onAddRef.current({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        name: `${event.latlng.lat.toFixed(4)}, ${event.latlng.lng.toFixed(4)}`,
      });
    });

    mapRef.current = map;
    markersRef.current = markers;
    polylineRef.current = polyline;

    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      polylineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    const polyline = polylineRef.current;

    if (!map || !markers || !polyline) {
      return;
    }

    markers.clearLayers();

    const latLngs = waypoints.map(
      (waypoint) => [waypoint.lat, waypoint.lng] as [number, number]
    );

    waypoints.forEach((waypoint, index) => {
      L.marker([waypoint.lat, waypoint.lng], {
        icon: L.divIcon({
          className: "route-pin",
          html: `<div style="background:#ec4899;color:white;border-radius:999px;width:24px;height:24px;display:grid;place-items:center;font-size:12px;font-weight:700;">${index + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(markers);
    });

    polyline.setLatLngs(latLngs);

    if (latLngs.length > 0) {
      map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 12 });
    }
  }, [waypoints]);

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-xl border border-zinc-200">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
