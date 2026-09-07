"use client";

import { useEffect, useMemo, useState } from "react";

type City = {
  name: string;
  lat: number;
  lng: number;
};

const WORLD_CITIES: City[] = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Londres", lat: 51.5074, lng: -0.1278 },
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { name: "Miami", lat: 25.7617, lng: -80.1918 },
  { name: "Monaco", lat: 43.7384, lng: 7.4246 },
  { name: "Marbella", lat: 36.509, lng: -4.886 },
  { name: "Ibiza", lat: 38.9067, lng: 1.4206 },
  { name: "Mykonos", lat: 37.4467, lng: 25.3289 },
  { name: "Dubaï", lat: 25.2048, lng: 55.2708 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Bangkok", lat: 13.7563, lng: 100.5018 },
  { name: "Bali", lat: -8.3405, lng: 115.092 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { name: "Rio", lat: -22.9068, lng: -43.1729 },
  { name: "Marrakech", lat: 31.6295, lng: -7.9811 },
];

const GLOBE_RADIUS = 118;
const PERSPECTIVE = 520;
const GLOBE_TILT = 0.21;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function latLngToPoint(lat: number, lng: number, radius: number) {
  const latRad = toRadians(lat);
  const lngRad = toRadians(lng);

  return {
    x: radius * Math.cos(latRad) * Math.sin(lngRad),
    y: -radius * Math.sin(latRad),
    z: radius * Math.cos(latRad) * Math.cos(lngRad),
  };
}

function rotateX(
  point: { x: number; y: number; z: number },
  angle: number
) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: point.x,
    y: point.y * cos - point.z * sin,
    z: point.y * sin + point.z * cos,
  };
}

function rotateY(
  point: { x: number; y: number; z: number },
  angle: number
) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: point.x * cos + point.z * sin,
    y: point.y,
    z: -point.x * sin + point.z * cos,
  };
}

function projectPoint(point: { x: number; y: number; z: number }) {
  const scale = PERSPECTIVE / (PERSPECTIVE + point.z);

  return {
    x: point.x * scale,
    y: point.y * scale,
    z: point.z,
    scale,
  };
}

export function AuthGlobe() {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let frame = 0;
    let start = 0;

    const animate = (time: number) => {
      if (!start) start = time;
      const elapsed = (time - start) / 1000;
      setRotation(elapsed * 0.22);
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const markers = useMemo(() => {
    return WORLD_CITIES.map((city) => {
      const point = latLngToPoint(city.lat, city.lng, GLOBE_RADIUS);
      const spun = rotateY(point, rotation);
      const tilted = rotateX(spun, GLOBE_TILT);
      const projected = projectPoint(tilted);
      const visible = projected.z > -GLOBE_RADIUS * 0.15;

      return {
        ...city,
        x: projected.x,
        y: projected.y,
        visible,
        depth: projected.z,
        opacity: visible
          ? Math.min(1, 0.35 + ((projected.z + GLOBE_RADIUS) / (2 * GLOBE_RADIUS)) * 0.65)
          : 0,
      };
    })
      .filter((marker) => marker.visible)
      .sort((a, b) => a.depth - b.depth);
  }, [rotation]);

  const rotationDeg = (rotation * 180) / Math.PI;
  const tiltDeg = (GLOBE_TILT * 180) / Math.PI;

  return (
    <div className="relative mx-auto flex h-[340px] w-[340px] items-center justify-center">
      <div className="pointer-events-none absolute inset-6 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-10 rounded-full bg-violet-500/10 blur-2xl" />

      <div
        className="relative h-[236px] w-[236px]"
        style={{ perspective: `${PERSPECTIVE}px` }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${tiltDeg}deg) rotateY(${rotationDeg}deg)`,
          }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_28%,#1e3a5f_0%,#0f172a_45%,#020617_100%)] shadow-[inset_-18px_-18px_40px_rgba(0,0,0,0.45),inset_12px_12px_30px_rgba(255,255,255,0.06),0_0_60px_rgba(236,72,153,0.12)]">
            <svg
              viewBox="0 0 236 236"
              className="h-full w-full opacity-30"
              aria-hidden="true"
            >
              {[20, 40, 60, 80, 100, 120, 140, 160].map((y) => (
                <ellipse
                  key={`lat-${y}`}
                  cx="118"
                  cy="118"
                  rx={Math.max(8, 110 * Math.sin((y / 180) * Math.PI))}
                  ry={8}
                  fill="none"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="0.8"
                  transform={`translate(0 ${y - 118})`}
                />
              ))}
              {[0, 30, 60, 90, 120, 150].map((angle) => (
                <ellipse
                  key={`lng-${angle}`}
                  cx="118"
                  cy="118"
                  rx="110"
                  ry="110"
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="0.8"
                  transform={`rotate(${angle} 118 118)`}
                />
              ))}
            </svg>
          </div>
        </div>

        {markers.map((marker) => (
          <div
            key={marker.name}
            className="absolute z-10 flex items-center gap-1.5 whitespace-nowrap"
            style={{
              left: `calc(50% + ${marker.x}px)`,
              top: `calc(50% + ${marker.y}px)`,
              transform: "translate(-50%, -50%)",
              opacity: marker.opacity,
            }}
          >
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.9)]" />
            <span className="text-[10px] font-medium tracking-wide text-white/90 drop-shadow-sm">
              {marker.name}
            </span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-full border border-white/5" />
    </div>
  );
}
