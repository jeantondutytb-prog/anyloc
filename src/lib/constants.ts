import { DESTINATION_SPOTS } from "@/lib/destination-spots";

export const CHECKOUT_CTA_LABEL = "Débloque ton accès";

export const CHECKOUT_CTA_LABEL_SHORT = "Accès immédiat";

export const CHECKOUT_CTA_SUBLINE =
  "Accès immédiat · Annulation en 1 clic · Installation guidée";

export const CHECKOUT_MARKETING_LINE =
  "Active Anyloc sur le plan de ton choix — Snap, Insta, Tinder et toutes tes apps.";

export const CHECKOUT_SELECT_SUBLINE =
  "Même accès complet sur tous les plans — Snap, Insta, Tinder et toutes tes apps. Seule la durée facturée change.";

export const CHECKOUT_HEADLINE =
  "Paiement sécurisé — ta carte est débitée tout de suite, accès immédiat.";

export const SITE = {
  name: "Anyloc",
  domain: "anyloc.io",
  tagline: "Ton GPS. Ton délire. Partout.",
  description:
    "Anyloc te fait choisir où ton tel se croit — Snap, Insta, apps de rencontre, jeux : une loc pour tout l'appareil.",
};

/** Bénéfices identiques sur tous les plans — seule la durée change. */
export const PLAN_VALUE_STACK = [
  "Changements de loc illimités sur toutes tes apps",
  "Snap, Insta, Tinder, Life360, Pokémon GO",
  "Compatible iPhone et Android",
  "Trajets simulés crédibles sur la map",
  "Installation guidée pas à pas",
];

/** Consentement affiché par Stripe juste au-dessus du bouton de paiement. */
export const CHECKOUT_PAY_CONSENT =
  "En payant, tu acceptes nos conditions générales (anyloc.io/conditions-generales), tu demandes l'accès immédiat au service et tu renonces à ton droit de rétractation de 14 jours. Remboursement possible uniquement via la garantie 48 h, sous conditions.";

/** Prérequis matériel affiché sur chaque plan, avant l'achat. */
export const DEVICE_REQUIREMENT_NOTE =
  "iPhone : un ordinateur (Mac ou PC) est obligatoire une fois pour l'installation. Android : aucun ordinateur requis.";

export const PAYWALL_TESTIMONIALS = [
  {
    quote: "Mes potes ont rien capté, c'est incroyable.",
    author: "Lucas",
    city: "Lyon",
    avatar: "/reviews/lucas.jpg",
  },
  {
    quote: "Installé en 10 min sur Android, j'ai mis ma loc à Marbella direct.",
    author: "Inès",
    city: "Paris",
    avatar: "/reviews/ines.jpg",
  },
  {
    quote: "J'ai pris l'annuel direct, zéro regret.",
    author: "Mehdi",
    city: "Marseille",
    avatar: "/reviews/mehdi.jpg",
  },
  {
    quote: "Setup iPhone en 15 min, loc à Bali sur Snap direct.",
    author: "Théo",
    city: "Bordeaux",
  },
  {
    quote: "Ma meuf croit que je suis à Ibiza depuis 3 jours mdrr.",
    author: "Camille",
    city: "Toulouse",
  },
  {
    quote: "Snap + Plans Apple nickel, mes potes ont flipé.",
    author: "Rayan",
    city: "Nice",
  },
  {
    quote: "Android galé un peu mais le tutoriel m'a sauvé.",
    author: "Sofia",
    city: "Nantes",
  },
  {
    quote: "Loc Marbella pour le weekend, personne n'a douté.",
    author: "Karim",
    city: "Lille",
  },
  {
    quote: "Install nickel, j'ai gardé l'abo mensuel.",
    author: "Julie",
    city: "Strasbourg",
  },
] as const;

export const REFUND_POLICY_SUMMARY =
  "Accès immédiat : en payant, tu renonces à ton droit de rétractation. Garantie 48 h : si ta loc ne bouge pas, on te rembourse, sous conditions.";

/**
 * Garantie « Ta loc bouge pas ? Remboursé. » — affichée sur le paywall avant
 * l'achat et détaillée dans /politique-de-remboursement. Une seule source pour
 * que les deux textes ne divergent jamais.
 */
export const GUARANTEE = {
  badge: "Garantie 48 h",
  title: "Ta loc bouge pas ? On te rembourse.",
  summary:
    "Ta position ne bouge pas malgré le support ? Ton 1er paiement est remboursé.",
  conditions: [
    {
      t: "Demande sous 48 h",
      d: "Tu fais la demande dans les 48 heures qui suivent ton premier paiement.",
    },
    {
      t: "Installation terminée",
      d: "Ton téléphone est connecté à ton compte Anyloc. On le vérifie de notre côté.",
    },
    {
      t: "Vidéo d'écran sans coupure",
      d: "Un enregistrement de l'écran de ton tel, en une seule prise : tu choisis une position dans Anyloc, tu l'actives, puis tu ouvres Plans (iPhone) ou Google Maps (Android), qui affiche toujours ta vraie position. L'heure doit être visible.",
    },
    {
      t: "Dépannage suivi",
      d: "Tu as écrit au support et testé les solutions proposées, sans résultat.",
    },
    {
      t: "Abonnement actif",
      d: "Tu n'as pas résilié avant ta demande : résilier vaut renoncement à la garantie.",
    },
  ],
} as const;

export const CANCELLATION_WARNING =
  "Ton abonnement ne sera plus renouvelé. Tu gardes l'accès au service, au dashboard et aux téléchargements jusqu'à la fin de la période déjà payée.";

/** Anciens price IDs Stripe — abonnés existants conservent leur tarif (ne pas migrer). */
export const LEGACY_STRIPE_PRICE_IDS = [
  "price_1UDMpbENC8ag2ECjNc7JAw5O", // Mensuel 8 € (grandfathered)
] as const;

/** Plans retirés du checkout — libellés pour les abonnés existants. */
export const LEGACY_PLAN_LABELS: Record<string, string> = {
  weekly: "Hebdomadaire",
  admin: "Admin",
  clipper: "Clipper",
};

export const PLANS = [
  {
    id: "monthly",
    mobileApp: false,
    name: "Mensuel",
    price: "9,90€",
    period: "/mois",
    perDay: "0,33",
    perDayLabel: "€/jour",
    billedNote:
      "Facturé 9,90 € chaque mois. Résiliable à tout moment — accès conservé jusqu'à la fin du mois payé.",
    compare: "Flexible si tu testes encore",
    description: "Sans engagement, tu paies mois par mois.",
    savings: undefined,
    features: PLAN_VALUE_STACK,
    popular: false,
    ctaLabel: CHECKOUT_CTA_LABEL,
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY,
  },
  {
    id: "6months",
    mobileApp: false,
    name: "6 mois",
    price: "34,90€",
    period: "/6 mois",
    perDay: "≈ 0,19",
    perDayLabel: "€/jour",
    billedNote:
      "Facturé 34,90 € tous les 6 mois. Résiliable à tout moment — accès conservé jusqu'à la fin de la période payée.",
    compare: "Soit 69,80 € sur l'année si tu reprends",
    description: "Le sweet spot si tu l'utilises souvent.",
    savings: "Économise 41 % vs mensuel",
    features: PLAN_VALUE_STACK,
    popular: false,
    ctaLabel: CHECKOUT_CTA_LABEL,
    stripePriceId: process.env.STRIPE_PRICE_6MONTHS,
  },
  {
    id: "annual",
    mobileApp: true,
    name: "Annuel",
    price: "49,00€",
    period: "/an",
    perDay: "≈ 0,13",
    perDayLabel: "€/jour",
    billedNote: "Facturé 49,00 € une fois par an.",
    compare: "Tu gardes 69 € sur l'année",
    badge: "-59 %",
    description: "Le meilleur deal si t'es un habitué.",
    savings: "Tu gardes 69 € sur l'année · -59 % vs mensuel",
    features: PLAN_VALUE_STACK,
    popular: true,
    ctaLabel: CHECKOUT_CTA_LABEL,
    stripePriceId: process.env.STRIPE_PRICE_ANNUAL,
  },
];

export type Plan = (typeof PLANS)[number];

/**
 * Plan preselected across the funnel (landing CTAs → onboarding → signup →
 * checkout). Annual: the only plan with the mobile app, and the best value.
 */
export const DEFAULT_PLAN_ID = "annual";

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

export function getOnboardingTrialUrl(plan?: string) {
  return getCheckoutUrl(plan);
}

export function getPostOnboardingSignupUrl(plan?: string) {
  const planId = isValidPlanId(plan) ? plan! : DEFAULT_PLAN_ID;
  const checkoutUrl = getCheckoutUrl(planId);
  return `/signup?plan=${planId}&next=${encodeURIComponent(checkoutUrl)}`;
}

/** @deprecated Use getOnboardingTrialUrl */
export function getOnboardingPaywallUrl(plan?: string) {
  return getOnboardingTrialUrl(plan);
}

export function getCheckoutUrl(plan: string = DEFAULT_PLAN_ID) {
  const planId = isValidPlanId(plan) ? plan : DEFAULT_PLAN_ID;
  return `/checkout?plan=${planId}`;
}

// Shown on the landing and in its FAQPage JSON-LD. Install troubleshooting
// (Windows warning, LocalDevVPN renewal) lives in the dashboard guides.
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
    q: "Ça passe sur iPhone et Android ?",
    a:
      "Oui. Sur Android : 3 étapes sur le tel. Sur iPhone : un Mac ou un PC une seule fois (limite Apple), puis tu gères ta loc depuis l'iPhone. Le renouvellement (~7 jours) se fait avec LocalDevVPN, sans rebrancher l'ordi.",
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

export const SAVED_LOCATIONS = DESTINATION_SPOTS.map(({ name, lat, lng }) => ({
  name,
  lat,
  lng,
}));
