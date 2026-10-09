import { PAYWALL_TESTIMONIALS, PLAN_IDS, PLAN_VALUE_STACK } from "@/lib/constants";

export const CHECKOUT_REVIEWS = PAYWALL_TESTIMONIALS.map((testimonial) => ({
  name: testimonial.author,
  stars: 5,
  text: testimonial.quote,
  city: testimonial.city,
  /** Profile photo under /public, only with the reviewer's consent. */
  avatar: "avatar" in testimonial ? (testimonial.avatar as string) : undefined,
}));

export const CHECKOUT_COPY = {
  guaranteeConditionsToggle: "Voir les conditions",
  unlockTitle: "Ce que tu débloques",
  faqTitle: "Les questions qu'on nous pose",
  reviewsListTitle: "Ce qu'ils en disent",
  resumeTitle: "Reprends là où tu en étais",
  paymentProcessor: "Paiement sécurisé, encaissé par Stripe",
  popularBadge: "Le plus choisi",
  planMobileApp: "App mobile incluse",
  planDesktopOnly: "Sur PC et Mac",
  continueCta: "Continuer",
  redirecting: "Redirection vers le paiement…",
  modalTitle: "Paiement",
  modalCancelAnytime: "Résiliable à tout moment, en 1 clic depuis ton espace.",
  modalFallbackLead: "Le paiement ne s'affiche pas ?",
  modalFallbackCta: "Payer sur la page sécurisée Stripe ↗",
  payOpening: "On prépare ton paiement…",
  retryCta: "Réessayer",
  downgradeTitle: (price: string) => `Paiement de ${price} refusé ?`,
  downgradeLead: (price: string) =>
    `Ta banque a peut-être bloqué le montant. Commence avec le Mensuel à ${price}, sans engagement.`,
  downgradeNoMobileApp: "L'app iPhone reste réservée à l'Annuel.",
  downgradeCta: (price: string) => `Passer au Mensuel à ${price}`,
  faq: [
    {
      q: "Ma carte sera débitée tout de suite ?",
      a:
        "Oui. Tu paies à la validation et tu as accès tout de suite. Tu peux annuler en 1 clic depuis ton espace — la résiliation coupe l'accès immédiatement. Si ta loc ne bouge pas, la garantie 48 h te rembourse ton 1er paiement (conditions juste au-dessus).",
    },
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
        "Oui. Sur Android : 3 étapes sur le tel, aucun ordinateur requis. Sur iPhone : un ordinateur (Mac ou PC) est obligatoire une fois pour l'installation (limite Apple), puis tu gères ta loc depuis l'iPhone — sans rebrancher l'ordi. Pas d'ordi ? Prends le plan seulement si tu peux en emprunter un.",
    },
  ],
  reviewsTitle: "Ils l'ont fait",
  reviewsVerified: "Abonné vérifié",
  canceled:
    "Paiement annulé. Reprends quand tu veux — ton plan reste sélectionné.",
  backCta: "Changer de destination",
  errGeneric: "Une erreur est survenue. Réessaie dans quelques instants.",
  errStart: "Impossible de démarrer le paiement.",
  focusTitle: "Plus qu'une étape",
  focusOfferNote: "1er mois à 4,95 €",
  focusShowAllPlans: "Voir tous les plans",
  recoveryOfferApplied:
    "🎁 Ton offre est appliquée : ton 1er mois à 4,95 € au lieu de 9,90 €.",
  recoveryOfferPickMonthly:
    "🎁 Ton offre -50 % sur le 1er mois est valable sur le plan Mensuel.",
  errNetwork:
    "Le paiement n'a pas pu se charger : ta connexion a coupé. Vérifie ton réseau puis réessaie.",
} as const;

/** One short line above the plans; picks up the city teleported to in onboarding. */
export function getCheckoutHeadline(city?: string) {
  if (city) {
    return { before: "Garde ta loc à", highlight: city };
  }

  return { before: "Active", highlight: "Anyloc" };
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
