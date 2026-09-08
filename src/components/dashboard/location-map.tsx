"use client";

import { useEffect, useRef } from "react";
import {
  GeoJSONSource,
  Map,
  Marker,
  NavigationControl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const SIMPLE_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

interface Location {
  name: string;
  lat: number;
  lng: number;
}

function createPinElement(active: boolean) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="map-pin ${active ? "map-pin--active" : ""}">
      <span class="map-pin__dot"></span>
    </div>
  `;
  return wrapper;
}

function createGeoJSONCircle(
  center: [number, number],
  radiusInMeters: number,
  points = 64
) {
  const [lng, lat] = center;
  const km = radiusInMeters / 1000;
  const distanceX = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = km / 110.574;
  const coordinates: [number, number][] = [];

  for (let i = 0; i < points; i += 1) {
    const theta = (i / points) * (2 * Math.PI);
    coordinates.push([
      lng + distanceX * Math.cos(theta),
      lat + distanceY * Math.sin(theta),
    ]);
  }

  coordinates.push(coordinates[0]);

  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [coordinates],
    },
  };
}

function addActiveRadiusLayers(map: Map) {
  map.addSource("active-outer", {
    type: "geojson",
    data: createGeoJSONCircle([0, 0], 500),
  });
  map.addSource("active-inner", {
    type: "geojson",
    data: createGeoJSONCircle([0, 0], 180),
  });

  map.addLayer({
    id: "active-outer-fill",
    type: "fill",
    source: "active-outer",
    layout: { visibility: "none" },
    paint: {
      "fill-color": "#f472b6",
      "fill-opacity": 0.12,
    },
  });
  map.addLayer({
    id: "active-outer-line",
    type: "line",
    source: "active-outer",
    layout: { visibility: "none" },
    paint: {
      "line-color": "#ec4899",
      "line-width": 1.5,
    },
  });
  map.addLayer({
    id: "active-inner-fill",
    type: "fill",
    source: "active-inner",
    layout: { visibility: "none" },
    paint: {
      "fill-color": "#f9a8d4",
      "fill-opacity": 0.18,
    },
  });
}

function updateActiveRadiusLayers(
  map: Map,
  active: boolean,
  lng: number,
  lat: number
) {
  const visibility = active ? "visible" : "none";

  for (const layerId of [
    "active-outer-fill",
    "active-outer-line",
    "active-inner-fill",
  ]) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }

  const outerSource = map.getSource("active-outer") as GeoJSONSource | undefined;
  const innerSource = map.getSource("active-inner") as GeoJSONSource | undefined;

  if (outerSource) {
    outerSource.setData(createGeoJSONCircle([lng, lat], 500));
  }

  if (innerSource) {
    innerSource.setData(createGeoJSONCircle([lng, lat], 180));
  }
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  const hasCenteredRef = useRef(false);

  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new Map({
      container: containerRef.current,
      style: SIMPLE_MAP_STYLE,
      center: [selected.lng, selected.lat],
      zoom: 12,
      minZoom: 3,
      maxPitch: 0,
      attributionControl: {},
    });

    map.addControl(
      new NavigationControl({ showCompass: false }),
      "top-left"
    );

    map.on("click", (event) => {
      onSelectRef.current({
        name: `${event.lngLat.lat.toFixed(4)}, ${event.lngLat.lng.toFixed(4)}`,
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
      });
    });

    map.on("load", () => {
      addActiveRadiusLayers(map);
      updateActiveRadiusLayers(map, active, selected.lng, selected.lat);
    });

    const pinWrapper = createPinElement(active);
    pinRef.current = pinWrapper.querySelector(".map-pin");
    const marker = new Marker({ element: pinWrapper, anchor: "bottom" })
      .setLngLat([selected.lng, selected.lat])
      .addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      pinRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) {
      return;
    }

    marker.setLngLat([selected.lng, selected.lat]);

    if (hasCenteredRef.current) {
      map.flyTo({
        center: [selected.lng, selected.lat],
        duration: 800,
        essential: true,
      });
    } else {
      hasCenteredRef.current = true;
    }

    if (map.isStyleLoaded()) {
      updateActiveRadiusLayers(map, active, selected.lng, selected.lat);
    } else {
      map.once("load", () => {
        updateActiveRadiusLayers(map, active, selected.lng, selected.lat);
      });
    }
  }, [selected.lat, selected.lng]);

  useEffect(() => {
    pinRef.current?.classList.toggle("map-pin--active", active);

    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (map.isStyleLoaded()) {
      updateActiveRadiusLayers(map, active, selected.lng, selected.lat);
    } else {
      map.once("load", () => {
        updateActiveRadiusLayers(map, active, selected.lng, selected.lat);
      });
    }
  }, [active, selected.lat, selected.lng]);

  return (
    <div className="simple-map-shell h-[400px] w-full lg:h-[500px]">
      <div ref={containerRef} className="simple-map h-full w-full rounded-xl" />
    </div>
  );
}
