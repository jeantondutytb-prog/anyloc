export type SpotCategory =
  | "all"
  | "villes"
  | "plages"
  | "fetes"
  | "luxe"
  | "asie"
  | "ameriques";

export type DestinationSpot = {
  name: string;
  lat: number;
  lng: number;
  category: Exclude<SpotCategory, "all">;
  emoji?: string;
};

export const SPOT_CATEGORIES: { id: SpotCategory; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "villes", label: "Villes" },
  { id: "plages", label: "Plages" },
  { id: "fetes", label: "Fêtes" },
  { id: "luxe", label: "Luxe" },
  { id: "asie", label: "Asie" },
  { id: "ameriques", label: "Amériques" },
];

export const DESTINATION_SPOTS: DestinationSpot[] = [
  { name: "Marbella — Puerto Banús", lat: 36.4848, lng: -4.9526, category: "plages", emoji: "🇪🇸" },
  { name: "Ibiza — Playa d'en Bossa", lat: 38.8767, lng: 1.4024, category: "fetes", emoji: "🇪🇸" },
  { name: "Miami — South Beach", lat: 25.7907, lng: -80.13, category: "plages", emoji: "🇺🇸" },
  { name: "Mykonos — Paradise Beach", lat: 37.4467, lng: 25.3289, category: "fetes", emoji: "🇬🇷" },
  { name: "Monaco — Port Hercule", lat: 43.7384, lng: 7.4246, category: "luxe", emoji: "🇲🇨" },
  { name: "Valencia — Ciudad de las Artes", lat: 39.4549, lng: -0.3523, category: "villes", emoji: "🇪🇸" },
  { name: "Paris — Tour Eiffel", lat: 48.8584, lng: 2.2945, category: "villes", emoji: "🇫🇷" },
  { name: "Londres — Big Ben", lat: 51.5007, lng: -0.1246, category: "villes", emoji: "🇬🇧" },
  { name: "New York — Times Square", lat: 40.758, lng: -73.9855, category: "villes", emoji: "🇺🇸" },
  { name: "Los Angeles — Santa Monica", lat: 34.0195, lng: -118.4912, category: "plages", emoji: "🇺🇸" },
  { name: "Tokyo — Shibuya", lat: 35.6595, lng: 139.7005, category: "asie", emoji: "🇯🇵" },
  { name: "Bali — Seminyak", lat: -8.6912, lng: 115.1682, category: "plages", emoji: "🇮🇩" },
  { name: "Phuket — Patong", lat: 7.8966, lng: 98.2969, category: "plages", emoji: "🇹🇭" },
  { name: "Marrakech — Médina", lat: 31.6295, lng: -7.9811, category: "villes", emoji: "🇲🇦" },
  { name: "Cancún — Zona Hotelera", lat: 21.1619, lng: -86.8515, category: "plages", emoji: "🇲🇽" },
  { name: "Rio — Copacabana", lat: -22.9711, lng: -43.1822, category: "plages", emoji: "🇧🇷" },
  { name: "Barcelone — Barceloneta", lat: 41.3784, lng: 2.1925, category: "plages", emoji: "🇪🇸" },
  { name: "Bangkok — Sukhumvit", lat: 13.7397, lng: 100.5599, category: "asie", emoji: "🇹🇭" },
  { name: "Dubai — Marina", lat: 25.0805, lng: 55.1403, category: "luxe", emoji: "🇦🇪" },
  { name: "Saint-Tropez — Port", lat: 43.2727, lng: 6.6407, category: "luxe", emoji: "🇫🇷" },
  { name: "Las Vegas — Strip", lat: 36.1147, lng: -115.1728, category: "fetes", emoji: "🇺🇸" },
  { name: "Tulum — Playa Paraíso", lat: 20.2114, lng: -87.4654, category: "plages", emoji: "🇲🇽" },
  { name: "Courchevel — 1850", lat: 45.4151, lng: 6.6347, category: "luxe", emoji: "🇫🇷" },
  { name: "Singapour — Marina Bay", lat: 1.2834, lng: 103.8607, category: "asie", emoji: "🇸🇬" },
  { name: "Sydney — Bondi Beach", lat: -33.8915, lng: 151.2767, category: "plages", emoji: "🇦🇺" },
];

export function filterSpotsByCategory(category: SpotCategory) {
  if (category === "all") {
    return DESTINATION_SPOTS;
  }

  return DESTINATION_SPOTS.filter((spot) => spot.category === category);
}
