"use client";

import { useEffect, useRef, useState } from "react";
import { getMapKit } from "@/lib/mapkit-client";

interface Location {
  name: string;
  lat: number;
  lng: number;
}

function syncActiveOverlays(
  map: mapkit.Map,
  outerCircle: mapkit.CircleOverlay,
  innerCircle: mapkit.CircleOverlay,
  active: boolean,
  overlaysVisibleRef: { current: boolean }
) {
  if (active && !overlaysVisibleRef.current) {
    map.addOverlay(outerCircle);
    map.addOverlay(innerCircle);
    overlaysVisibleRef.current = true;
    return;
  }

  if (!active && overlaysVisibleRef.current) {
    map.removeOverlay(outerCircle);
    map.removeOverlay(innerCircle);
    overlaysVisibleRef.current = false;
  }
}
function createRegion(lat: number, lng: number, mapkitApi: typeof mapkit) {
  return new mapkitApi.CoordinateRegion(
    new mapkitApi.Coordinate(lat, lng),
    new mapkitApi.CoordinateSpan(0.08, 0.08)
  );
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
  const mapRef = useRef<mapkit.Map | null>(null);
  const annotationRef = useRef<mapkit.MarkerAnnotation | null>(null);
  const outerCircleRef = useRef<mapkit.CircleOverlay | null>(null);
  const innerCircleRef = useRef<mapkit.CircleOverlay | null>(null);
  const onSelectRef = useRef(onSelect);
  const hasCenteredRef = useRef(false);
  const overlaysVisibleRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let disposed = false;
    let tapHandler:
      | ((event: { pointOnPage: DOMPoint; target: unknown }) => void)
      | null = null;

    void getMapKit()
      .then((mapkit) => {
        if (disposed || !containerRef.current) {
          return;
        }

        const map = new mapkit.Map(containerRef.current, {
          region: createRegion(selected.lat, selected.lng, mapkit),
          showsZoomControl: true,
          showsCompass: mapkit.Map.FeatureVisibility.Hidden,
          showsMapTypeControl: false,
          isRotationEnabled: false,
        });

        const annotation = new mapkit.MarkerAnnotation(
          new mapkit.Coordinate(selected.lat, selected.lng),
          {
            title: selected.name,
            color: active ? "#14b8a6" : "#ec4899",
            selected: true,
          }
        );

        const outerCircle = new mapkit.CircleOverlay(
          new mapkit.Coordinate(selected.lat, selected.lng),
          500,
          {
            style: new mapkit.Style({
              strokeColor: "#5eead4",
              fillColor: "rgba(45, 212, 191, 0.12)",
              lineWidth: 1.5,
              fillOpacity: 0.12,
              strokeOpacity: 0.8,
            }),
          }
        );

        const innerCircle = new mapkit.CircleOverlay(
          new mapkit.Coordinate(selected.lat, selected.lng),
          180,
          {
            style: new mapkit.Style({
              strokeColor: "#99f6e4",
              fillColor: "rgba(20, 184, 166, 0.18)",
              lineWidth: 1,
              fillOpacity: 0.18,
              strokeOpacity: 0.9,
            }),
          }
        );

        map.addAnnotation(annotation);

        tapHandler = (event) => {
          if (event.target !== map) {
            return;
          }

          const coordinate = map.convertPointOnPageToCoordinate(
            event.pointOnPage
          );

          onSelectRef.current({
            name: `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`,
            lat: coordinate.latitude,
            lng: coordinate.longitude,
          });
        };

        map.addEventListener("single-tap", tapHandler);

        mapRef.current = map;
        annotationRef.current = annotation;
        outerCircleRef.current = outerCircle;
        innerCircleRef.current = innerCircle;

        syncActiveOverlays(map, outerCircle, innerCircle, active, overlaysVisibleRef);
      })
      .catch((loadError) => {
        if (disposed) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger Apple Maps."
        );
      });

    return () => {
      disposed = true;
      const map = mapRef.current;

      if (map && tapHandler) {
        map.removeEventListener("single-tap", tapHandler);
      }

      map?.destroy();
      mapRef.current = null;
      annotationRef.current = null;
      outerCircleRef.current = null;
      innerCircleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const annotation = annotationRef.current;
    const outerCircle = outerCircleRef.current;
    const innerCircle = innerCircleRef.current;

    if (!map || !annotation || !outerCircle || !innerCircle) {
      return;
    }

    const coordinate = new mapkit.Coordinate(selected.lat, selected.lng);

    annotation.coordinate = coordinate;
    annotation.title = selected.name;
    outerCircle.coordinate = coordinate;
    innerCircle.coordinate = coordinate;

    if (hasCenteredRef.current && window.mapkit) {
      map.setRegionAnimated(
        createRegion(selected.lat, selected.lng, window.mapkit),
        true
      );
    } else {
      hasCenteredRef.current = true;
    }
  }, [selected.lat, selected.lng, selected.name]);

  useEffect(() => {
    const map = mapRef.current;
    const annotation = annotationRef.current;
    const outerCircle = outerCircleRef.current;
    const innerCircle = innerCircleRef.current;

    if (!map || !annotation || !outerCircle || !innerCircle) {
      return;
    }

    annotation.color = active ? "#14b8a6" : "#ec4899";
    syncActiveOverlays(map, outerCircle, innerCircle, active, overlaysVisibleRef);
  }, [active]);

  if (error) {
    return (
      <div className="apple-map-shell flex h-[400px] w-full items-center justify-center lg:h-[500px]">
        <div className="max-w-sm px-6 text-center">
          <p className="text-sm font-semibold text-zinc-900">
            Apple Maps non disponible
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {error.includes("non configuré")
              ? "Ajoute tes clés Apple MapKit dans les variables d'environnement pour afficher la carte."
              : error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="apple-map-shell h-[400px] w-full lg:h-[500px]">
      <div ref={containerRef} className="apple-map h-full w-full rounded-xl" />
    </div>
  );
}
