import { DESTINATION_SPOTS } from "@/lib/destination-spots";

export type OnboardingDestination = {
  id: string;
  city: string;
  area: string;
  emoji: string;
  lat: number;
  lng: number;
  imageGradient: string;
};

const DESTINATION_GRADIENTS: Record<string, string> = {
  Dubai: "from-amber-200 via-orange-300 to-rose-400",
  Marbella: "from-sky-300 via-cyan-300 to-emerald-300",
  Ibiza: "from-fuchsia-300 via-pink-400 to-orange-300",
  Miami: "from-cyan-300 via-sky-400 to-pink-300",
  Bali: "from-emerald-300 via-teal-300 to-amber-200",
  Tulum: "from-teal-300 via-emerald-300 to-lime-200",
  Mykonos: "from-sky-200 via-blue-300 to-indigo-300",
  Barcelone: "from-orange-300 via-rose-300 to-red-300",
  Cancún: "from-cyan-300 via-blue-400 to-indigo-400",
  Bangkok: "from-violet-300 via-fuchsia-400 to-pink-400",
  "Las Vegas": "from-purple-400 via-fuchsia-500 to-pink-500",
  Tokyo: "from-rose-300 via-pink-400 to-violet-400",
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
    imageGradient:
      DESTINATION_GRADIENTS[city] ??
      "from-pink-300 via-violet-300 to-indigo-300",
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
