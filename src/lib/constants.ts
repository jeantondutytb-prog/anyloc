import { DESTINATION_SPOTS } from "@/lib/destination-spots";

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

export const CHECKOUT_PERKS = [
  "Changements de loc illimités sur toutes tes apps",
  "Signal GPS réel — pas un screenshot ni un montage",
  "Snap, Insta, Tinder, jeux : une loc pour tout le tel",
  "Installation guidée pas à pas pour ton modèle",
  "Garantie 48 h si le GPS ne fonctionne pas",
];

export const REFUND_GUARANTEE_SUMMARY =
  "Garantie 48 h : installation complète + test du service. Demande sous 48 h après l'achat, abonnement actif. Voir la politique de remboursement.";

export const CANCELLATION_WARNING =
  "La résiliation prend effet immédiatement. Tu perds l'accès au service, au dashboard et aux téléchargements dès confirmation. Aucun remboursement au prorata.";

/** Anciens price IDs Stripe — abonnés existants conservent leur tarif (ne pas migrer). */
export const LEGACY_STRIPE_PRICE_IDS = [
  "price_1UDMpbENC8ag2ECjNc7JAw5O", // Mensuel 8 € (grandfathered)
] as const;

export const PLANS = [
  {
    id: "monthly",
    name: "Mensuel",
    price: "9,90€",
    period: "/mois",
    perDay: "0,33 €",
    perDayLabel: "/jour",
    billedNote: "Facturé 9,90 € chaque mois. Résiliation immédiate — perte d'accès instantanée.",
    compare: "Flexible si tu testes encore",
    description: "Sans engagement, tu paies mois par mois.",
    features: [
      "Tout le plan 6 mois",
      "Trajets simulés sur la map",
      "Bibliothèque de spots illimitée",
      "Accès web (1 profil)",
      "Nouvelles features en avant-première",
    ],
    popular: false,
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY,
  },
  {
    id: "6months",
    name: "6 mois",
    price: "34,90€",
    period: "/6 mois",
    perDay: "≈ 0,19 €",
    perDayLabel: "/jour",
    billedNote: "Facturé 34,90 € tous les 6 mois. Résiliation immédiate — perte d'accès instantanée.",
    compare: "Soit 69,80 € sur l'année si tu reprends",
    description: "Le sweet spot si tu l'utilises souvent.",
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
    id: "annual",
    name: "Annuel",
    price: "49,90€",
    period: "/an",
    perDay: "≈ 0,14 €",
    perDayLabel: "/jour",
    billedNote: "Facturé 49,90 € une fois par an.",
    compare: "Tu gardes 69 € sur l'année",
    badge: "App iPhone incluse",
    description: "Le meilleur deal si t'es un habitué.",
    savings: "Tu gardes 69€ sur l'année",
    features: [
      "Tout le plan Mensuel",
      "App iPhone sans ordi",
      "Accès web (3 profils)",
      "Support prioritaire",
      "Updates à vie incluses",
    ],
    popular: true,
    stripePriceId: process.env.STRIPE_PRICE_ANNUAL,
  },
];

export type Plan = (typeof PLANS)[number];

export const PLAN_IDS = PLANS.map((plan) => plan.id);

export function isValidPlanId(plan: string | undefined) {
  return plan !== undefined && PLAN_IDS.includes(plan as (typeof PLAN_IDS)[number]);
}

export function getCheckoutUrl(plan: string = "annual") {
  const planId = isValidPlanId(plan) ? plan : "annual";
  return `/checkout?plan=${planId}`;
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
      "Oui. Sur Android, tout se fait depuis le tel. Sur iPhone, une seule install via Mac ou PC (limite Apple), puis tu gères ta position et le renouvellement (~7 jours) depuis ton iPhone avec LocalDevVPN — sans repasser par l'ordi.",
  },
  {
    q: "Faut-il rebrancher le Mac tous les 7 jours ?",
    a:
      "Non. Installe LocalDevVPN sur ton iPhone, connecte le VPN en Wi-Fi, puis ouvre Anyloc. Le renouvellement se fait depuis ton tel. Le Mac ne sert qu'une seule fois, à la première installation.",
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

export const SAVED_LOCATIONS = DESTINATION_SPOTS.map(({ name, lat, lng }) => ({
  name,
  lat,
  lng,
}));
