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
  subA: `${SITE.name} hack ton GPS — Snap, Insta, Tinder, jeux : un réglage et `,
  subHl: "tout ton tel déménage",
  subB: ". Pas de screen, pas de montage — le même signal que si t'étais sur place.",
  valueTitle: "Un seul cheat code pour tout ton tel",
  included: [
    {
      t: "Multi-apps native",
      d:
        "Fini les apps qui marchent que sur Snap. Un réglage, toutes les apps impactées.",
    },
    {
      t: "Signal GPS réel",
      d:
        "Les autres solutions trichent en surface. Anyloc modifie le signal que ton tel envoie vraiment.",
    },
    {
      t: "Opérationnel en quelques minutes",
      d:
        "Pas besoin d'être un crack en tech. On te guide de l'inscription à ta première loc.",
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
        "Oui. Sur Android : 3 étapes sur le tel. Sur iPhone : un Mac ou un PC une seule fois (limite Apple), puis tu gères ta loc depuis l'iPhone — sans rebrancher l'ordi.",
    },
  ],
  proofTitle: "Même pin sur Snap et sur Plans",
  proofSub:
    "La map sociale et le GPS système affichent le même point — c'est ça la différence avec un screenshot.",
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
  "App iPhone incluse — change de ville depuis ton lit",
  "Tarif bloqué 12 mois",
  "Meilleur prix sur l'année",
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
