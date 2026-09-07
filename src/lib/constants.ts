export const SITE = {
  name: "Anyloc",
  domain: "anyloc.io",
  tagline: "Change ta position. Partout. Pour toutes tes apps.",
  description:
    "Anyloc modifie la position GPS de ton téléphone au niveau système — Snapchat, Instagram, Tinder, Pokémon GO et toutes tes apps.",
};

export const DESTINATIONS = [
  "Los Angeles",
  "Miami",
  "New York",
  "Paris",
  "Londres",
  "Tokyo",
  "Tokyo",
  "Bangkok",
  "Bali",
  "Ibiza",
  "Monaco",
  "Mykonos",
  "Marrakech",
  "Cancún",
  "Singapour",
  "Sydney",
  "Rio",
  "Barcelone",
];

export const PLANS = [
  {
    id: "weekly",
    name: "Hebdomadaire",
    price: "4,99€",
    period: "/semaine",
    description: "Flexible, sans engagement long terme.",
    features: [
      "Téléportation illimitée",
      "Toutes les apps supportées",
      "iOS & Android",
      "Support par email",
    ],
    popular: false,
    stripePriceId: process.env.STRIPE_PRICE_WEEKLY,
  },
  {
    id: "monthly",
    name: "Mensuel",
    price: "12,99€",
    period: "/mois",
    description: "Idéal pour tester sur la durée.",
    features: [
      "Tout du plan Hebdo",
      "Routes personnalisées",
      "Lieux favoris illimités",
      "Spoofing web (1 compte)",
      "Mises à jour prioritaires",
    ],
    popular: true,
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY,
  },
  {
    id: "annual",
    name: "Annuel",
    price: "49,99€",
    period: "/an",
    description: "Meilleur rapport qualité-prix.",
    savings: "Économise 106€/an",
    features: [
      "Tout du plan Mensuel",
      "App iPhone autonome",
      "Spoofing web (3 comptes)",
      "Support prioritaire 24/7",
      "Mises à jour à vie",
    ],
    popular: false,
    stripePriceId: process.env.STRIPE_PRICE_ANNUAL,
  },
];

export const COMPARISON = [
  {
    feature: "Position système (toutes les apps)",
    anyloc: true,
    vpn: false,
    fakeGps: false,
    screenshot: false,
  },
  {
    feature: "Snapchat, Insta, Tinder, jeux…",
    anyloc: true,
    vpn: false,
    fakeGps: "partial",
    screenshot: false,
  },
  {
    feature: "Tient en arrière-plan",
    anyloc: true,
    vpn: false,
    fakeGps: "partial",
    screenshot: false,
  },
  {
    feature: "Impossible à griller",
    anyloc: true,
    vpn: false,
    fakeGps: false,
    screenshot: false,
  },
  {
    feature: "Changement de ville en 1 tap",
    anyloc: true,
    vpn: false,
    fakeGps: "partial",
    screenshot: false,
  },
  {
    feature: "Routes réalistes",
    anyloc: true,
    vpn: false,
    fakeGps: false,
    screenshot: false,
  },
];

export const FAQ = [
  {
    q: "Anyloc fonctionne sur quelles apps ?",
    a:
      "Toutes les apps qui utilisent le GPS de ton téléphone : Snapchat, Instagram, Tinder, Bumble, Pokémon GO, Life360, et bien d'autres. Contrairement aux solutions limitées à une seule app, Anyloc modifie ta position au niveau système.",
  },
  {
    q: "Est-ce qu'on peut me griller ?",
    a:
      "Non. Ce n'est pas un screenshot ni un montage : c'est ta vraie position système, en direct. Tes contacts voient un vrai pin GPS au bon endroit — exactement ce que ton téléphone envoie.",
  },
  {
    q: "Un VPN ne suffit pas ?",
    a:
      "Non. Un VPN change ton adresse IP, pas ta position GPS. Les apps lisent directement le capteur GPS de ton téléphone — c'est exactement ce qu'Anyloc modifie.",
  },
  {
    q: "iPhone ou Android ?",
    a:
      "Les deux. Sur Android, tout se fait depuis ton téléphone en autonomie. Sur iPhone, une mise en route unique depuis Mac ou PC est nécessaire (restriction Apple), puis tu pilotes tout depuis ton iPhone.",
  },
  {
    q: "Faut-il un jailbreak ?",
    a:
      "Non. Anyloc ne jailbreak pas ton téléphone. Tu auras besoin du mode développeur sur iOS et de quelques réglages guidés sur Android — tout est expliqué pas à pas dans ton dashboard.",
  },
  {
    q: "Ma position reste si je ferme l'app ?",
    a:
      "Sur Android, oui — la position tient en arrière-plan même écran verrouillé. Sur iPhone avec l'app autonome (plan annuel), pareil. Sinon, la position tient toute la session active.",
  },
];

export const FEATURES = [
  {
    title: "Téléportation",
    description:
      "Cherche n'importe quelle ville, adresse ou lieu et pose ton pin en quelques secondes.",
    icon: "MapPin",
  },
  {
    title: "Toutes les apps",
    description:
      "Snap, Insta, Tinder, jeux, apps de rencontre — une seule position pour tout ton téléphone.",
    icon: "Smartphone",
  },
  {
    title: "Routes réalistes",
    description:
      "Simule un trajet entre deux points avec vitesse personnalisable et arrêts réalistes.",
    icon: "Route",
  },
  {
    title: "Lieux favoris",
    description:
      "Sauvegarde tes spots préférés — Tokyo, Miami, Ibiza — et y retourne en un tap.",
    icon: "Bookmark",
  },
  {
    title: "Spoofing web",
    description:
      "Change aussi ta position sur les versions web de Snapchat et autres apps sociales.",
    icon: "Globe",
  },
  {
    title: "Multi-plateforme",
    description:
      "iPhone, Android, Mac et Windows. Contrôle ta position depuis n'importe quel appareil.",
    icon: "Monitor",
  },
];

export const SAVED_LOCATIONS = [
  { name: "Los Angeles — Hollywood", lat: 34.0928, lng: -118.3287 },
  { name: "Miami Beach", lat: 25.7907, lng: -80.13 },
  { name: "Paris — Tour Eiffel", lat: 48.8584, lng: 2.2945 },
  { name: "Tokyo — Shibuya", lat: 35.6595, lng: 139.7004 },
  { name: "Ibiza", lat: 38.9067, lng: 1.4206 },
  { name: "Monaco", lat: 43.7384, lng: 7.4246 },
];
