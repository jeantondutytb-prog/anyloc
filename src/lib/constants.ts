export const SITE = {
  name: "Anyloc",
  domain: "anyloc.io",
  tagline: "Ton GPS. Ton choix. Partout.",
  description:
    "Anyloc te permet de définir où ton téléphone se situe — Snap, Insta, apps de rencontre, jeux : une seule position pour tout l'appareil.",
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
    id: "weekly",
    name: "Hebdomadaire",
    price: "4,99€",
    period: "/semaine",
    description: "Parfait pour un week-end ou une semaine de test.",
    features: [
      "Changements de position illimités",
      "Compatible avec toutes tes apps",
      "iOS et Android",
      "Assistance par email",
    ],
    popular: false,
    stripePriceId: process.env.STRIPE_PRICE_WEEKLY,
  },
  {
    id: "monthly",
    name: "Mensuel",
    price: "12,99€",
    period: "/mois",
    description: "Le sweet spot pour un usage régulier.",
    features: [
      "Tout le plan Hebdo",
      "Trajets simulés sur carte",
      "Bibliothèque de lieux illimitée",
      "Accès web (1 profil)",
      "Nouvelles fonctions en avant-première",
    ],
    popular: true,
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY,
  },
  {
    id: "annual",
    name: "Annuel",
    price: "49,99€",
    period: "/an",
    description: "Le meilleur deal si tu l'utilises souvent.",
    savings: "Tu gardes 106€ sur l'année",
    features: [
      "Tout le plan Mensuel",
      "App iPhone sans ordinateur",
      "Accès web (3 profils)",
      "Support prioritaire",
      "Mises à jour incluses à vie",
    ],
    popular: false,
    stripePriceId: process.env.STRIPE_PRICE_ANNUAL,
  },
];

export const COMPARISON = [
  {
    feature: "Modifie le GPS de tout le téléphone",
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
    feature: "Déplacement simulé crédible",
    anyloc: true,
    vpn: false,
    fakeGps: false,
    screenshot: false,
  },
];

export const FAQ = [
  {
    q: "Quelles applications sont compatibles ?",
    a:
      "Toutes celles qui lisent le GPS de ton appareil : Snapchat, Instagram, Tinder, Bumble, Pokémon GO, Life360, etc. Anyloc agit au niveau du système, pas dans une seule app isolée.",
  },
  {
    q: "Mes contacts peuvent détecter un faux ?",
    a:
      "Ils voient un pin GPS normal, mis à jour en temps réel — le même signal que ton téléphone enverrait s'il était vraiment sur place. Pas de capture d'écran, pas de montage.",
  },
  {
    q: "Pourquoi un VPN ne marche pas ?",
    a:
      "Un VPN masque ton IP internet, pas ta position physique. Les apps sociales interrogent le capteur GPS du téléphone. Anyloc intervient exactement à cet endroit.",
  },
  {
    q: "Ça fonctionne sur iPhone et Android ?",
    a:
      "Oui. Sur Android, l'installation et la gestion se font entièrement sur le mobile. Sur iPhone, une configuration initiale via Mac ou PC est nécessaire (limite imposée par Apple), puis tu gères tout depuis ton tel.",
  },
  {
    q: "Jailbreak ou modifications risquées ?",
    a:
      "Aucun jailbreak. Tu actives le mode développeur sur iOS et quelques réglages sur Android — chaque étape est détaillée dans ton espace client.",
  },
  {
    q: "La position reste active si je quitte l'app ?",
    a:
      "Sur Android, oui, y compris écran verrouillé. Avec le plan annuel sur iPhone, c'est pareil. Sinon, la position reste tant que la session Anyloc tourne.",
  },
];

export const FEATURES = [
  {
    title: "Zéro limite géographique",
    description:
      "Tape une ville, une adresse ou un lieu précis et déplace ton pin en quelques secondes.",
    icon: "MapPin",
  },
  {
    title: "Multi-apps native",
    description:
      "Une modification, toutes les apps impactées — réseaux sociaux, rencontres, jeux, tout passe par le même GPS.",
    icon: "Smartphone",
  },
  {
    title: "Trajets simulés",
    description:
      "Trace un parcours entre deux points, règle la vitesse et ajoute des pauses pour un déplacement crédible.",
    icon: "Route",
  },
  {
    title: "Spots enregistrés",
    description:
      "Garde tes destinations favorites — Marbella, Ibiza, Miami — et reviens y instantanément.",
    icon: "Bookmark",
  },
  {
    title: "Version web incluse",
    description:
      "Étends aussi ta position aux interfaces web de Snapchat et d'autres services connectés.",
    icon: "Globe",
  },
  {
    title: "Pilotage centralisé",
    description:
      "Gère ton GPS depuis ton téléphone, ton Mac ou ton PC — un compte, tous tes appareils.",
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
