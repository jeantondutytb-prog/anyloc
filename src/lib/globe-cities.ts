export type GlobeCity = {
  name: string;
  lat: number;
  lng: number;
};

export const GLOBE_CITIES: GlobeCity[] = [
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

export const GLOBE_RADIUS = 1.6;

export function latLngToGlobeVector3(
  lat: number,
  lng: number,
  radius: number
): [number, number, number] {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  const x = radius * Math.cos(latRad) * Math.cos(lngRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.sin(lngRad);

  return [x, y, z];
}
