import { DESTINATION_SPOTS } from "@/lib/destination-spots";
import type { GeocodeResult } from "@/lib/geocoding";

export type OnboardingDestination = {
  id: string;
  city: string;
  area: string;
  emoji: string;
  lat: number;
  lng: number;
};

function toOnboardingDestination(spot: {
  name: string;
  lat: number;
  lng: number;
  emoji?: string;
}): OnboardingDestination {
  const [city, area = ""] = spot.name.split(" — ");

  return {
    id: spot.name,
    city,
    area,
    emoji: spot.emoji ?? "📍",
    lat: spot.lat,
    lng: spot.lng,
  };
}

const TRENDING_NAMES = [
  "Dubai — Marina",
  "Marbella — Puerto Banús",
  "Ibiza — Playa d'en Bossa",
  "Miami — South Beach",
  "Bali — Seminyak",
  "Tulum — Playa Paraíso",
  "Mykonos — Paradise Beach",
  "Barcelone — Barceloneta",
  "Cancún — Zona Hotelera",
  "Bangkok — Sukhumvit",
  "Las Vegas — Strip",
  "Tokyo — Shibuya",
];

export const TRENDING_DESTINATIONS: OnboardingDestination[] = TRENDING_NAMES.map(
  (name) => {
    const spot = DESTINATION_SPOTS.find((item) => item.name === name);
    if (!spot) {
      throw new Error(`Missing destination spot: ${name}`);
    }
    return toOnboardingDestination(spot);
  }
);

export const ALL_ONBOARDING_DESTINATIONS: OnboardingDestination[] =
  DESTINATION_SPOTS.map(toOnboardingDestination);

export function geocodeResultToOnboardingDestination(
  result: GeocodeResult
): OnboardingDestination {
  const localMatch = ALL_ONBOARDING_DESTINATIONS.find(
    (destination) =>
      destination.city.toLowerCase() === result.name.toLowerCase() ||
      destination.id.toLowerCase().startsWith(`${result.name.toLowerCase()} —`)
  );

  if (localMatch) {
    return {
      ...localMatch,
      lat: result.lat,
      lng: result.lng,
    };
  }

  return {
    id: result.id,
    city: result.name,
    area: result.subtitle,
    emoji: "📍",
    lat: result.lat,
    lng: result.lng,
  };
}

export function mergeOnboardingSearchResults(
  local: OnboardingDestination[],
  remote: GeocodeResult[]
) {
  const seen = new Set(local.map((destination) => destination.id.toLowerCase()));
  const seenCities = new Set(
    local.map((destination) => destination.city.toLowerCase())
  );

  const merged = [...local];

  for (const result of remote) {
    const destination = geocodeResultToOnboardingDestination(result);
    const cityKey = destination.city.toLowerCase();

    if (seen.has(destination.id.toLowerCase()) || seenCities.has(cityKey)) {
      continue;
    }

    seen.add(destination.id.toLowerCase());
    seenCities.add(cityKey);
    merged.push(destination);
  }

  return merged.slice(0, 10);
}

export function searchOnboardingDestinations(query: string) {
  const trimmed = query.trim().toLowerCase();

  if (trimmed.length < 2) {
    return [];
  }

  return ALL_ONBOARDING_DESTINATIONS.filter(
    (destination) =>
      destination.city.toLowerCase().includes(trimmed) ||
      destination.area.toLowerCase().includes(trimmed) ||
      destination.id.toLowerCase().includes(trimmed)
  ).slice(0, 8);
}

export const ONBOARDING_DESTINATION_KEY = "anyloc-onboarding-destination";
