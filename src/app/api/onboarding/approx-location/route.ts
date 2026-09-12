import { headers } from "next/headers";
import {
  getApproxLocationFromHeaders,
  getFallbackApproxLocation,
} from "@/lib/approx-user-location";
import { reverseNominatimPlace } from "@/lib/nominatim-geocoding";

export async function GET() {
  const requestHeaders = await headers();
  const approx = getApproxLocationFromHeaders((name) => requestHeaders.get(name));

  if (approx) {
    return Response.json({ found: true, ...approx });
  }

  const lat = Number.parseFloat(requestHeaders.get("x-vercel-ip-latitude") ?? "");
  const lng = Number.parseFloat(requestHeaders.get("x-vercel-ip-longitude") ?? "");

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    try {
      const place = await reverseNominatimPlace(lat, lng);

      if (place?.name) {
        return Response.json({
          found: true,
          city: place.name,
          area: place.subtitle || "Position réelle",
        });
      }
    } catch {
      // Fall through to generic fallback.
    }
  }

  const fallback = getFallbackApproxLocation();
  return Response.json({ found: false, ...fallback });
}
