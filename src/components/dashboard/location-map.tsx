"use client";

import { useEffect } from "react";
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

const markerIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Location {
  name: string;
  lat: number;
  lng: number;
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
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
      ._getIconUrl;
  }, []);

  return (
    <div className="h-[400px] w-full lg:h-[500px]">
      <MapContainer
        center={[selected.lat, selected.lng]}
        zoom={13}
        className="h-full w-full rounded-xl"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={onSelect} />
        <MapRecenter lat={selected.lat} lng={selected.lng} />
        <Marker position={[selected.lat, selected.lng]} icon={markerIcon} />
        {active && (
          <Circle
            center={[selected.lat, selected.lng]}
            radius={500}
            pathOptions={{
              color: "#e879f9",
              fillColor: "#c084fc",
              fillOpacity: 0.15,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
