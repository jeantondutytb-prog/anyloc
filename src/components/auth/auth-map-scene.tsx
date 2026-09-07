"use client";

import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { AUTH_DESTINATIONS } from "@/lib/auth-destinations";

export function AuthMapScene() {
  return (
    <div className="auth-map h-[340px] w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/30">
      <MapContainer
        center={[35, 8]}
        zoom={3}
        minZoom={2}
        maxZoom={6}
        className="h-full w-full"
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {AUTH_DESTINATIONS.map((destination) => (
          <CircleMarker
            key={destination.name}
            center={[destination.lat, destination.lng]}
            radius={6}
            pathOptions={{
              color: "#f472b6",
              fillColor: "#ec4899",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} className="auth-map-tooltip">
              {destination.name}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
