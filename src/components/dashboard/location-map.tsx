"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DARK_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

interface Location {
  name: string;
  lat: number;
  lng: number;
}

function createGtaBlipIcon(active: boolean) {
  return L.divIcon({
    className: "gta-blip-marker",
    html: `
      <div class="gta-blip ${active ? "gta-blip--active" : ""}">
        <span class="gta-blip__ring"></span>
        <span class="gta-blip__core"></span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function MapClickHandler({
  onSelect,
}: {
  onSelect: (loc: Location) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect({
        name: `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });
  return null;
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 0.8 });
  }, [lat, lng, map]);

  return null;
}

export default function LocationMap({
  selected,
  onSelect,
  active,
}: {
  selected: Location;
  onSelect: (loc: Location) => void;
  active: boolean;
}) {
  const blipIcon = useMemo(() => createGtaBlipIcon(active), [active]);

  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
      ._getIconUrl;
  }, []);

  return (
    <div className="gta-map-shell h-[400px] w-full lg:h-[500px]">
      <MapContainer
        center={[selected.lat, selected.lng]}
        zoom={13}
        className="gta-map h-full w-full rounded-xl"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={DARK_TILE_URL}
          className="gta-map-tiles"
        />
        <MapClickHandler onSelect={onSelect} />
        <MapRecenter lat={selected.lat} lng={selected.lng} />
        <Marker
          position={[selected.lat, selected.lng]}
          icon={blipIcon}
          zIndexOffset={1000}
        />
        {active && (
          <>
            <Circle
              center={[selected.lat, selected.lng]}
              radius={500}
              pathOptions={{
                color: "#5eead4",
                fillColor: "#2dd4bf",
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: "6 8",
              }}
            />
            <Circle
              center={[selected.lat, selected.lng]}
              radius={180}
              pathOptions={{
                color: "#99f6e4",
                fillColor: "#14b8a6",
                fillOpacity: 0.12,
                weight: 1,
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
