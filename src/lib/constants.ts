import { DESTINATION_SPOTS } from "@/lib/destination-spots";
import { TRIAL_CTA_LABEL } from "@/lib/trial";

export const SITE = {
  name: "Anyloc",
  domain: "anyloc.io",
  tagline: "Ton GPS. Ton délire. Partout.",
  description:
    "Anyloc te fait choisir où tu apparais sur Snap, Insta et Tinder — depuis Safari ou Chrome, iPhone comme Android, sans app à installer.",
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
  "Changements de loc illimités sur tes apps web",
  "Signal GPS réel — pas un screenshot ni un montage",
  "Snap, Insta, Tinder : une loc, iPhone comme Android",
  "Mise en route guidée depuis le site, pas à pas",
  "Garantie 48 h si le GPS ne fonctionne pas",
];

/** Bénéfices identiques sur tous les plans — seule la durée change. */
export const PLAN_VALUE_STACK = [
  "Changements de loc illimités",
  "Snap, Insta, Tinder depuis le navigateur",
  "iPhone et Android, même méthode",
  "Carte mondiale pour choisir ta ville",
  "Mise en route guidée depuis le site",
  "Garantie 48 h si le GPS ne fonctionne pas",
];

export const PAYWALL_TESTIMONIALS = [
  {
    quote: "Mes potes ont rien capté, le pin était nickel sur Snap.",
    author: "Lucas",
    city: "Lyon",
  },
  {
    quote: "4 étapes dans le site, loc à Marbella direct sur Snap Web.",
    author: "Inès",
    city: "Paris",
  },
  {
    quote: "J'ai pris l'annuel direct, zéro regret.",
    author: "Mehdi",
    city: "Marseille",
  },
  {
    quote: "Sur iPhone, sans ordi. Loc à Bali sur Snap Web direct.",
    author: "Théo",
    city: "Bordeaux",
  },
  {
    quote: "Ma meuf croit que je suis à Ibiza depuis 3 jours mdrr.",
    author: "Camille",
    city: "Toulouse",
  },
  {
    quote: "Snap Web nickel, mes potes ont flipé.",
    author: "Rayan",
    city: "Nice",
  },
  {
    quote: "Le tuto dans le site m’a sauvé, même pas besoin d’app.",
    author: "Sofia",
    city: "Nantes",
  },
  {
    quote: "Loc Marbella pour le weekend, personne n'a douté.",
    author: "Karim",
    city: "Lille",
  },
  {
    quote: "Essai gratuit nickel, j'ai gardé l'abo mensuel.",
    author: "Julie",
    city: "Strasbourg",
  },
] as const;

export const REFUND_GUARANTEE_SUMMARY =
  "Garantie 48 h : installation complète + test du service. Demande sous 48 h après l'achat, abonnement actif. Voir la politique de remboursement.";

export const CANCELLATION_WARNING =
  "La résiliation prend effet immédiatement. Tu perds l'accès au service, au dashboard et aux téléchargements dès confirmation. Aucun remboursement au prorata.";

/** Anciens price IDs Stripe — abonnés existants conservent leur tarif (ne pas migrer). */
export const LEGACY_STRIPE_PRICE_IDS = [
  "price_1UDMpbENC8ag2ECjNc7JAw5O", // Mensuel 8 € (grandfathered)
] as const;

/** Plans retirés du checkout — libellés pour les abonnés existants. */
export const LEGACY_PLAN_LABELS: Record<string, string> = {
  weekly: "Hebdomadaire",
};

export const PLANS = [
  {
    id: "monthly",
    name: "Mensuel",
    price: "9,90€",
    period: "/mois",
    perDay: "0,33",
    perDayLabel: "€/jour",
    billedNote:
      "Facturé 9,90 € chaque mois. Résiliation immédiate — perte d'accès instantanée.",
    compare: "Flexible si tu testes encore",
    description: "Sans engagement, tu paies mois par mois.",
    savings: undefined,
    features: PLAN_VALUE_STACK,
    popular: false,
    ctaLabel: TRIAL_CTA_LABEL,
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY,
  },
  {
    id: "6months",
    name: "6 mois",
    price: "34,90€",
    period: "/6 mois",
    perDay: "≈ 0,19",
    perDayLabel: "€/jour",
    billedNote:
      "Facturé 34,90 € tous les 6 mois. Résiliation immédiate — perte d'accès instantanée.",
    compare: "Soit 69,80 € sur l'année si tu reprends",
    description: "Le sweet spot si tu l'utilises souvent.",
    savings: "Économise 42 % vs mensuel",
    features: PLAN_VALUE_STACK,
    popular: false,
    ctaLabel: TRIAL_CTA_LABEL,
    stripePriceId: process.env.STRIPE_PRICE_6MONTHS,
  },
  {
    id: "annual",
    name: "Annuel",
    price: "49,90€",
    period: "/an",
    perDay: "≈ 0,14",
    perDayLabel: "€/jour",
    billedNote: "Facturé 49,90 € une fois par an.",
    compare: "Tu gardes 69 € sur l'année",
    badge: "Le plus choisi",
    description: "Le meilleur deal si t'es un habitué.",
    savings: "Tu gardes 69 € sur l'année · -58 % vs mensuel",
    features: PLAN_VALUE_STACK,
    popular: true,
    ctaLabel: TRIAL_CTA_LABEL,
    stripePriceId: process.env.STRIPE_PRICE_ANNUAL,
  },
];

export type Plan = (typeof PLANS)[number];

export const PLAN_IDS = PLANS.map((plan) => plan.id);

export function isValidPlanId(plan: string | undefined) {
  return plan !== undefined && PLAN_IDS.includes(plan as (typeof PLAN_IDS)[number]);
}

export function getPlanDisplayName(planId: string | null | undefined) {
  if (!planId) {
    return null;
  }

  return PLANS.find((plan) => plan.id === planId)?.name ?? LEGACY_PLAN_LABELS[planId] ?? planId;
}

export const ONBOARDING_ENTRY_URL = "/onboarding";

export function getOnboardingUrl(plan?: string) {
  const planId = isValidPlanId(plan) ? plan! : null;
  return planId ? `${ONBOARDING_ENTRY_URL}?plan=${planId}` : ONBOARDING_ENTRY_URL;
}

export const ONBOARDING_TOTAL_STEPS = 2;

export function getOnboardingTrialUrl(plan?: string) {
  return getCheckoutUrl(plan);
}

export function getPostOnboardingSignupUrl(plan?: string) {
  const planId = isValidPlanId(plan) ? plan! : "annual";
  const checkoutUrl = getCheckoutUrl(planId);
  return `/signup?plan=${planId}&next=${encodeURIComponent(checkoutUrl)}`;
}

/** @deprecated Use getOnboardingTrialUrl */
export function getOnboardingPaywallUrl(plan?: string) {
  return getOnboardingTrialUrl(plan);
}

export function getCheckoutUrl(plan: string = "annual") {
  const planId = isValidPlanId(plan) ? plan : "annual";
  return `/checkout?plan=${planId}`;
}

export const COMPARISON = [
  {
    feature: "Sans ordinateur ni app à installer",
    anyloc: true,
    vpn: true,
    fakeGps: false,
    screenshot: true,
  },
  {
    feature: "Snap, Insta, Tinder dans le navigateur",
    anyloc: true,
    vpn: false,
    fakeGps: "partial",
    screenshot: false,
  },
  {
    feature: "iPhone et Android, même chemin",
    anyloc: true,
    vpn: true,
    fakeGps: false,
    screenshot: true,
  },
  {
    feature: "Signal GPS (pas une image)",
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
    feature: "Marche tout de suite après l’essai",
    anyloc: true,
    vpn: true,
    fakeGps: false,
    screenshot: true,
  },
];

export const FAQ = [
  {
    q: "Ça marche sur quelles apps ?",
    a:
      "Snapchat, Instagram et Tinder depuis le navigateur de ton téléphone — plus Tinder Web, Snap Web, etc. iPhone et Android suivent le même guide dans le site.",
  },
  {
    q: "Mes potes peuvent capter que c'est fake ?",
    a:
      "Ils voient un pin GPS normal, mis à jour en temps réel — le même point que si tu ouvrais Snap / Tinder Web depuis cette ville. Pas de screen, pas de montage.",
  },
  {
    q: "Ça passe sur iPhone et Android ?",
    a:
      "Oui — et c’est le même chemin pour tout le monde. Après l’essai, un guide dans le site t’accompagne : tu ouvres Anyloc sur ton tel, tu ajoutes l’icône, tu crées le bouton GPS, puis tu choisis ta ville sur la carte.",
  },
  {
    q: "Pourquoi un VPN ça suffit pas ?",
    a:
      "Un VPN cache ton IP, pas ta position. Les apps sociales checkent le GPS. Anyloc intervient pile là, depuis le navigateur de ton téléphone.",
  },
  {
    q: "Faut-il un ordinateur ou installer une app ?",
    a:
      "Non. Pour l’instant tout se fait depuis le site, sur ton téléphone. iPhone et Android suivent les mêmes étapes.",
  },
  {
    q: "Faut jailbreaker ou bidouiller le tel ?",
    a:
      "Non. Tu restes dans Safari ou Chrome. Le guide t’indique exactement quels boutons taper.",
  },
  {
    q: "La loc reste active si je ferme l’onglet ?",
    a:
      "Le dashboard garde ta ville. Pour que Snap / Tinder Web la voient, rouvre-les dans le navigateur et tape ton favori Anyloc GPS.",
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
    title: "Snap, Insta, Tinder",
    description:
      "Ouvre-les dans Safari ou Chrome, tape le bouton GPS Anyloc — ta fausse loc part avec.",
    icon: "Smartphone",
  },
  {
    title: "Sans ordi, sans APK",
    description:
      "iPhone et Android, même chemin. Pas d’App Store, pas de câble, pas de fichier à installer.",
    icon: "Globe",
  },
  {
    title: "Spots enregistrés",
    description:
      "Garde tes destinations fav — Marbella, Ibiza, Miami — et reviens y en un tap.",
    icon: "Bookmark",
  },
  {
    title: "Guide en 4 étapes",
    description:
      "Après l’essai, on t’accompagne dans le site : icône, bouton GPS, puis ta première ville.",
    icon: "Route",
  },
  {
    title: "Carte toujours sous la main",
    description:
      "Change de ville depuis le dashboard, sur ton tel ou ton ordi — un compte, une loc.",
    icon: "Monitor",
  },
];

export const SAVED_LOCATIONS = DESTINATION_SPOTS.map(({ name, lat, lng }) => ({
  name,
  lat,
  lng,
}));
