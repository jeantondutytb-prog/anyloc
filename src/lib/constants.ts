export const SITE = {
  name: "Anyloc",
  domain: "anyloc.io",
  tagline: "Ton GPS. Ton délire. Partout.",
  description:
    "Anyloc te fait choisir où ton tel se croit — Snap, Insta, apps de rencontre, jeux : une loc pour tout l'appareil.",
};

export const DESTINATIONS = [
  "Marbella",
  "Ibiza",
  "Miami",
  "Mykonos",
  "Monaco",
  "Los Angeles",
  "New York",
  "Tokyo",
  "Bali",
  "Phuket",
  "Valencia",
  "Marrakech",
  "Paris",
  "Londres",
  "Cancún",
  "Rio",
  "Barcelone",
  "Bangkok",
];

export const PLANS = [
  {
    id: "6months",
    name: "6 mois",
    price: "24,99€",
    period: "/6 mois",
    description: "Idéal pour tester sur la durée sans t'engager à l'année.",
    features: [
      "Changements de loc illimités",
      "Compatible avec toutes tes apps",
      "iOS et Android",
      "Support par mail",
    ],
    popular: false,
    stripePriceId: process.env.STRIPE_PRICE_6MONTHS,
  },
  {
    id: "monthly",
    name: "Mensuel",
    price: "12,99€",
    period: "/mois",
    description: "Le sweet spot si tu l'utilises souvent.",
    features: [
      "Tout le plan 6 mois",
      "Trajets simulés sur la map",
      "Bibliothèque de spots illimitée",
      "Accès web (1 profil)",
      "Nouvelles features en avant-première",
    ],
    popular: true,
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY,
  },
  {
    id: "annual",
    name: "Annuel",
    price: "49,99€",
    period: "/an",
    description: "Le meilleur deal si t'es un habitué.",
    savings: "Tu gardes 106€ sur l'année",
    features: [
      "Tout le plan Mensuel",
      "App iPhone sans ordi",
      "Accès web (3 profils)",
      "Support prioritaire",
      "Updates à vie incluses",
    ],
    popular: false,
    stripePriceId: process.env.STRIPE_PRICE_ANNUAL,
  },
] ;

export const PLAN_IDS = PLANS.map((plan) => plan.id);

export function isValidPlanId(plan: string | undefined) {
  return plan !== undefined && PLAN_IDS.includes(plan as (typeof PLAN_IDS)[number]);
}

export const COMPARISON = [
  {
    feature: "Modifie le GPS de tout le tel",
    anyloc: true,
    vpn: false,
    fakeGps: false,
    screenshot: false,
  },
  {
    feature: "Snap, Insta, Tinder, jeux en même temps",
    anyloc: true,
    vpn: false,
    fakeGps: "partial",
    screenshot: false,
  },
  {
    feature: "Reste actif en arrière-plan",
    anyloc: true,
    vpn: false,
    fakeGps: "partial",
    screenshot: false,
  },
  {
    feature: "Signal GPS réel (pas une image)",
    anyloc: true,
    vpn: false,
    fakeGps: false,
    screenshot: false,
  },
  {
    feature: "Nouvelle ville en un clic",
    anyloc: true,
    vpn: false,
    fakeGps: "partial",
    screenshot: false,
  },
  {
    feature: "Trajet simulé crédible",
    anyloc: true,
    vpn: false,
    fakeGps: false,
    screenshot: false,
  },
];

export const FAQ = [
  {
    q: "Ça marche sur quelles apps ?",
    a:
      "Toutes celles qui lisent le GPS de ton tel : Snapchat, Insta, Tinder, Bumble, Pokémon GO, Life360, etc. Anyloc agit au niveau du système, pas dans une seule app.",
  },
  {
    q: "Mes potes peuvent capter que c'est fake ?",
    a:
      "Ils voient un pin GPS normal, mis à jour en temps réel — le même signal que ton tel enverrait s'il était vraiment sur place. Pas de screen, pas de montage.",
  },
  {
    q: "Pourquoi un VPN ça suffit pas ?",
    a:
      "Un VPN cache ton IP, pas ta position. Les apps sociales checkent le capteur GPS du tel. Anyloc intervient pile là.",
  },
  {
    q: "Ça passe sur iPhone et Android ?",
    a:
      "Oui. Sur Android, tout se fait depuis le tel. Sur iPhone, faut une config initiale via Mac ou PC (limite Apple), puis tu gères tout depuis ton mobile.",
  },
  {
    q: "Faut jailbreaker ou bidouiller le tel ?",
    a:
      "Non. Tu actives le mode dev sur iOS et quelques réglages sur Android — chaque étape est expliquée dans ton espace client.",
  },
  {
    q: "La loc reste active si je ferme l'app ?",
    a:
      "Sur Android, oui, même écran verrouillé. Avec le plan annuel sur iPhone, pareil. Sinon, la loc reste tant que la session Anyloc tourne.",
  },
];

export const FEATURES = [
  {
    title: "Zéro limite géo",
    description:
      "Tape une ville, une adresse ou un spot précis et bouge ton pin en quelques secondes.",
    icon: "MapPin",
  },
  {
    title: "Multi-apps native",
    description:
      "Un réglage, toutes les apps impactées — réseaux sociaux, rencontres, jeux, tout passe par le même GPS.",
    icon: "Smartphone",
  },
  {
    title: "Trajets simulés",
    description:
      "Trace un parcours entre deux points, règle la vitesse et mets des pauses pour un déplacement crédible.",
    icon: "Route",
  },
  {
    title: "Spots enregistrés",
    description:
      "Garde tes destinations fav — Marbella, Ibiza, Miami — et reviens y en un tap.",
    icon: "Bookmark",
  },
  {
    title: "Version web incluse",
    description:
      "Étends aussi ta loc aux interfaces web de Snapchat et d'autres services connectés.",
    icon: "Globe",
  },
  {
    title: "Pilotage centralisé",
    description:
      "Gère ton GPS depuis ton tel, ton Mac ou ton PC — un compte, tous tes appareils.",
    icon: "Monitor",
  },
];

export const SAVED_LOCATIONS = [
  { name: "Marbella — Puerto Banús", lat: 36.4848, lng: -4.9526 },
  { name: "Ibiza — Playa d'en Bossa", lat: 38.8767, lng: 1.4024 },
  { name: "Miami — South Beach", lat: 25.7907, lng: -80.13 },
  { name: "Mykonos — Paradise Beach", lat: 37.4467, lng: 25.3289 },
  { name: "Monaco — Port Hercule", lat: 43.7384, lng: 7.4246 },
  { name: "Valencia — Ciudad de las Artes", lat: 39.4549, lng: -0.3523 },
];
