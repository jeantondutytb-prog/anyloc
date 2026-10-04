import { headers } from "next/headers";

/** Approximate position of the visitor, from their IP (city level). */
export type VisitorLocation = {
  city: string;
  lat: number;
  lng: number;
};

/**
 * Reads the IP geolocation Vercel adds to every request, so the onboarding
 * can start the pin "where you are" without asking for location permission.
 * City-level only, never stored. Null locally or when Vercel has no match.
 */
export async function getVisitorLocation(): Promise<VisitorLocation | null> {
  const headerStore = await headers();
  const lat = Number(headerStore.get("x-vercel-ip-latitude"));
  const lng = Number(headerStore.get("x-vercel-ip-longitude"));
  const rawCity = headerStore.get("x-vercel-ip-city");

  if (!rawCity || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    // `next dev` has no Vercel headers: pretend to be in Paris to see the flight.
    return process.env.NODE_ENV === "development"
      ? { city: "Paris", lat: 48.8566, lng: 2.3522 }
      : null;
  }

  let city = rawCity;
  try {
    // Vercel URL-encodes the city ("Saint-%C3%89tienne").
    city = decodeURIComponent(rawCity);
  } catch {}

  return { city, lat, lng };
}
