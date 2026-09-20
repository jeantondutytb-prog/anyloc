import { PAYWALL_TESTIMONIALS, PLAN_IDS, PLAN_VALUE_STACK, SITE } from "@/lib/constants";
import { TRIAL_CTA_SUBLINE, TRIAL_SELECT_SUBLINE } from "@/lib/trial";

export const CHECKOUT_REVIEWS = PAYWALL_TESTIMONIALS.map((testimonial) => ({
  name: testimonial.author,
  stars: 5,
  text: testimonial.quote,
  city: testimonial.city,
}));

export const CHECKOUT_COPY = {
  scarcity: TRIAL_CTA_SUBLINE,
  h1a: "Fake ta loc",
  h1b: "alors que t'es chez toi.",
  subA: `${SITE.name} change ta loc sur Snap, Insta, Tinder : un réglage et `,
  subHl: "tu apparais où tu veux",
  subB: ". Pas de screen, pas de montage — depuis Safari ou Chrome, iPhone comme Android.",
  valueTitle: "Un seul cheat code, iPhone comme Android",
  included: [
    {
      t: "Snap, Insta, Tinder",
      d:
        "Tu les ouvres dans le navigateur, tu tapes le bouton GPS Anyloc — ta fausse loc part avec.",
    },
    {
      t: "Sans ordi, sans app à installer",
      d:
        "Pas de câble, pas d’APK, pas d’App Store. Le guide dans le site suffit.",
    },
    {
      t: "Opérationnel en quelques minutes",
      d:
        "4 étapes après l’essai, puis tu choisis ta ville sur la carte.",
    },
    {
      t: "Annule quand tu veux",
      d: "Résiliation en 1 clic depuis ton espace — sans appel, sans formulaire.",
    },
  ],
  selectTitle: "Choisis ta durée",
  selectSub: TRIAL_SELECT_SUBLINE,
  guaranteeBadge: "Garantie 48 h",
  perksTitle: "Inclus dans ton accès",
  payOpening: "On prépare ton essai gratuit…",
  updating: "Mise à jour du plan…",
  trust: [
    "🔒 Paiement sécurisé",
    "· 0 € maintenant",
    "· Accès dès la validation",
  ],
  reassure: [
    "Paiement 100% sécurisé",
    "Annulation en 1 clic, sans justificatif",
    "Accès immédiat après validation",
  ],
  secureTitle: "Paiement 100% sécurisé",
  ssl: "SSL · chiffrement 256 bits · Stripe",
  consent:
    "En validant, tu acceptes nos {cgv}. Gère ton abonnement depuis ton espace client.",
  consentCgv: "conditions générales",
  faqTitle: "T'as des questions ? Normal.",
  faq: [
    {
      q: "Ça marche sur quelles apps ?",
      a:
        "Snapchat, Instagram et Tinder depuis le navigateur de ton téléphone. Après l’essai, le guide dans le site t’indique exactement comment les ouvrir.",
    },
    {
      q: "Mes potes peuvent capter que c'est fake ?",
      a:
        "Ils voient un pin GPS normal, mis à jour en temps réel — le même point que si tu ouvrais Snap / Tinder Web depuis cette ville. Pas de screen, pas de montage.",
    },
    {
      q: "Ça passe sur iPhone et Android ?",
      a:
        "Oui — même chemin pour tout le monde. Après l’essai, un guide dans le site t’accompagne étape par étape, puis tu choisis ta ville sur la carte. Pas besoin d’ordi ni d’app à installer.",
    },
  ],
  proofTitle: "Même pin sur Snap Web et sur la carte",
  proofSub:
    "Tu choisis la ville dans Anyloc, Snap / Tinder Web affichent le même point — pas un screenshot.",
  reviewsTitle: "Ils l'ont fait",
  reviewsVerified: "Abonné vérifié",
  destinationLabel: "Ta prochaine loc",
  canceled:
    "Paiement annulé. Reprends quand tu veux — ton plan reste sélectionné.",
  retryCta: "Essayer gratuitement",
  backCta: "Changer de destination",
  errGeneric: "Une erreur est survenue. Réessaie dans quelques instants.",
  errStart: "Impossible de démarrer l'essai.",
} as const;

export function getCheckoutHeadline(city?: string) {
  if (city) {
    return {
      before: "Fake ta loc à",
      highlight: city,
      after: "alors que t'es chez toi.",
      multiline: true,
    };
  }

  return {
    before: CHECKOUT_COPY.h1a,
    highlight: CHECKOUT_COPY.h1b,
    after: null,
    multiline: true,
  };
}

export const CHECKOUT_PLAN_IDS = PLAN_IDS;

export const CHECKOUT_BASE_PERKS = PLAN_VALUE_STACK;

export const CHECKOUT_ANNUAL_EXTRA_PERKS = [
  "Le meilleur prix sur l'année",
  "Tarif bloqué 12 mois",
  "Accès immédiat après l’essai",
] as const;

/** Paires Snap Map + Plans Apple, swipables sur le checkout. */
export const CHECKOUT_PROOF_SLIDES = [
  {
    id: "dubai-paris",
    snap: { src: "/proof/snap-dubai.png", label: "Snap · Dubaï" },
    system: { src: "/proof/sys-paris.png", label: "Plans · Paris" },
  },
  {
    id: "miami-tokyo",
    snap: { src: "/proof/snap-miami.png", label: "Snap · Miami" },
    system: { src: "/proof/sys-tokyo.png", label: "Plans · Tokyo" },
  },
  {
    id: "nyc-rio",
    snap: { src: "/proof/snap-new-york.png", label: "Snap · New York" },
    system: { src: "/proof/sys-rio.png", label: "Plans · Rio" },
  },
] as const;
