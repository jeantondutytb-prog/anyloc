// Ported from apps/ios/Anyloc/Spots.swift — keep both lists in sync.

export type AppSpot = {
  name: string;
  country: string;
  lat: number;
  lng: number;
  category: string;
  emoji: string;
};

export const APP_SPOT_CATEGORIES = [
  { id: "all", label: "Tout" },
  { id: "villes", label: "Villes" },
  { id: "plages", label: "Plages" },
  { id: "fetes", label: "Fêtes" },
  { id: "luxe", label: "Luxe" },
  { id: "asie", label: "Asie" },
  { id: "aeroports", label: "Aéroports" },
] as const;

export const APP_SPOTS: AppSpot[] = [
  { name: "Paris", country: "France", lat: 48.8584, lng: 2.2945, category: "villes", emoji: "🇫🇷" },
  { name: "Londres", country: "Royaume-Uni", lat: 51.5007, lng: -0.1246, category: "villes", emoji: "🇬🇧" },
  { name: "New York", country: "États-Unis", lat: 40.758, lng: -73.9855, category: "villes", emoji: "🇺🇸" },
  { name: "Dubai Marina", country: "Émirats", lat: 25.0805, lng: 55.1403, category: "luxe", emoji: "🇦🇪" },
  { name: "Burj Khalifa", country: "Émirats", lat: 25.1972, lng: 55.2744, category: "luxe", emoji: "🇦🇪" },
  { name: "Tokyo", country: "Japon", lat: 35.6595, lng: 139.7005, category: "asie", emoji: "🇯🇵" },
  { name: "Kyoto", country: "Japon", lat: 35.0116, lng: 135.7681, category: "asie", emoji: "🇯🇵" },
  { name: "Bangkok", country: "Thaïlande", lat: 13.7397, lng: 100.5599, category: "asie", emoji: "🇹🇭" },
  { name: "Phuket", country: "Thaïlande", lat: 7.8966, lng: 98.2969, category: "plages", emoji: "🇹🇭" },
  { name: "Bali", country: "Indonésie", lat: -8.6912, lng: 115.1682, category: "plages", emoji: "🇮🇩" },
  { name: "Singapour", country: "Singapour", lat: 1.2834, lng: 103.8607, category: "asie", emoji: "🇸🇬" },
  { name: "Séoul", country: "Corée du Sud", lat: 37.5665, lng: 126.978, category: "asie", emoji: "🇰🇷" },
  { name: "Hong Kong", country: "Hong Kong", lat: 22.2819, lng: 114.1581, category: "asie", emoji: "🇭🇰" },
  { name: "Maldives", country: "Maldives", lat: 4.1755, lng: 73.5093, category: "luxe", emoji: "🇲🇻" },
  { name: "Rome", country: "Italie", lat: 41.8902, lng: 12.4922, category: "villes", emoji: "🇮🇹" },
  { name: "Venise", country: "Italie", lat: 45.4341, lng: 12.3388, category: "villes", emoji: "🇮🇹" },
  { name: "Florence", country: "Italie", lat: 43.7731, lng: 11.256, category: "villes", emoji: "🇮🇹" },
  { name: "Positano", country: "Italie", lat: 40.6281, lng: 14.485, category: "plages", emoji: "🇮🇹" },
  { name: "Barcelone", country: "Espagne", lat: 41.3784, lng: 2.1925, category: "villes", emoji: "🇪🇸" },
  { name: "Madrid", country: "Espagne", lat: 40.4168, lng: -3.7038, category: "villes", emoji: "🇪🇸" },
  { name: "Ibiza", country: "Espagne", lat: 38.9067, lng: 1.4206, category: "fetes", emoji: "🇪🇸" },
  { name: "Marbella", country: "Espagne", lat: 36.5099, lng: -4.8862, category: "plages", emoji: "🇪🇸" },
  { name: "Lisbonne", country: "Portugal", lat: 38.7077, lng: -9.1365, category: "villes", emoji: "🇵🇹" },
  { name: "Amsterdam", country: "Pays-Bas", lat: 52.3731, lng: 4.8926, category: "villes", emoji: "🇳🇱" },
  { name: "Berlin", country: "Allemagne", lat: 52.5163, lng: 13.3777, category: "fetes", emoji: "🇩🇪" },
  { name: "Prague", country: "Tchéquie", lat: 50.0875, lng: 14.4213, category: "villes", emoji: "🇨🇿" },
  { name: "Dubrovnik", country: "Croatie", lat: 42.6407, lng: 18.1077, category: "villes", emoji: "🇭🇷" },
  { name: "Mykonos", country: "Grèce", lat: 37.4467, lng: 25.3289, category: "fetes", emoji: "🇬🇷" },
  { name: "Santorin", country: "Grèce", lat: 36.4618, lng: 25.3753, category: "plages", emoji: "🇬🇷" },
  { name: "Monaco", country: "Monaco", lat: 43.7384, lng: 7.4246, category: "luxe", emoji: "🇲🇨" },
  { name: "Saint-Tropez", country: "France", lat: 43.2727, lng: 6.6407, category: "luxe", emoji: "🇫🇷" },
  { name: "Courchevel", country: "France", lat: 45.4151, lng: 6.6347, category: "luxe", emoji: "🇫🇷" },
  { name: "Nice", country: "France", lat: 43.6947, lng: 7.2653, category: "plages", emoji: "🇫🇷" },
  { name: "Istanbul", country: "Turquie", lat: 41.0086, lng: 28.9802, category: "villes", emoji: "🇹🇷" },
  { name: "Marrakech", country: "Maroc", lat: 31.6258, lng: -7.9891, category: "villes", emoji: "🇲🇦" },
  { name: "Pyramides de Gizeh", country: "Égypte", lat: 29.9792, lng: 31.1342, category: "villes", emoji: "🇪🇬" },
  { name: "Zanzibar", country: "Tanzanie", lat: -6.1622, lng: 39.1921, category: "plages", emoji: "🇹🇿" },
  { name: "Le Cap", country: "Afrique du Sud", lat: -33.9249, lng: 18.4241, category: "villes", emoji: "🇿🇦" },
  { name: "Miami Beach", country: "États-Unis", lat: 25.7907, lng: -80.13, category: "plages", emoji: "🇺🇸" },
  { name: "Los Angeles", country: "États-Unis", lat: 34.0195, lng: -118.4912, category: "villes", emoji: "🇺🇸" },
  { name: "Las Vegas", country: "États-Unis", lat: 36.1147, lng: -115.1728, category: "fetes", emoji: "🇺🇸" },
  { name: "San Francisco", country: "États-Unis", lat: 37.788, lng: -122.4075, category: "villes", emoji: "🇺🇸" },
  { name: "Hawaï", country: "États-Unis", lat: 21.2793, lng: -157.8292, category: "plages", emoji: "🇺🇸" },
  { name: "Cancún", country: "Mexique", lat: 21.1619, lng: -86.8515, category: "fetes", emoji: "🇲🇽" },
  { name: "Tulum", country: "Mexique", lat: 20.2114, lng: -87.4654, category: "plages", emoji: "🇲🇽" },
  { name: "Rio de Janeiro", country: "Brésil", lat: -22.9711, lng: -43.1822, category: "plages", emoji: "🇧🇷" },
  { name: "Buenos Aires", country: "Argentine", lat: -34.6037, lng: -58.3816, category: "villes", emoji: "🇦🇷" },
  { name: "Sydney", country: "Australie", lat: -33.8915, lng: 151.2767, category: "plages", emoji: "🇦🇺" },
  { name: "Bora Bora", country: "Polynésie française", lat: -16.5004, lng: -151.7497, category: "luxe", emoji: "🇵🇫" },
  { name: "Reykjavik", country: "Islande", lat: 64.1417, lng: -21.9266, category: "villes", emoji: "🇮🇸" },
  { name: "CDG Paris", country: "France", lat: 49.0097, lng: 2.5479, category: "aeroports", emoji: "✈️" },
  { name: "JFK New York", country: "États-Unis", lat: 40.6413, lng: -73.7781, category: "aeroports", emoji: "✈️" },
  { name: "LAX Los Angeles", country: "États-Unis", lat: 33.9425, lng: -118.408, category: "aeroports", emoji: "✈️" },
  { name: "DXB Dubai", country: "Émirats", lat: 25.2532, lng: 55.3657, category: "aeroports", emoji: "✈️" },
  { name: "Heathrow", country: "Royaume-Uni", lat: 51.47, lng: -0.4543, category: "aeroports", emoji: "✈️" },
];
