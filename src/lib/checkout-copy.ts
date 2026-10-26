import { PAYWALL_TESTIMONIALS, PLAN_VALUE_STACK } from "@/lib/constants";

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
  paymentProcessor: "Paiement sécurisé, encaissé par Stripe",
  popularBadge: "Le plus choisi",
  planDesktopOnly: "Sur PC et Mac",
  /** The pay button shows what is actually charged, so the popup holds no surprise. */
  continueCta: (amount: string, period: string) => `Débloquer · ${amount} pour ${period}`,
  continueCtaRecoveryOffer: "Débloquer · 4,95 € le 1er mois",
  /** Right under the pay button, where the fear of paying for nothing peaks. */
  payReassurance: "Ça marche ou remboursé · Résiliable en 1 clic",
  proofVideoTitle: "Regarde, ça marche pour de vrai",
  proofVideoSteps: [
    "Je choisis Londres dans Anyloc",
    "J'ouvre Snap : je suis à Londres",
    "Je passe à Paris, Snap suit",
  ],
  proofVideoCaption: "Filmé en une prise sur iPhone · accéléré ×3",
  proofVideoAlt: "Enregistrement d'écran : la position Snap Map passe à Londres puis à Paris avec Anyloc",
  redirecting: "Redirection vers le paiement…",
  modalTitle: "Paiement",
  modalCancelAnytime: "Résiliable à tout moment, en 1 clic depuis ton espace.",
  modalFallbackLead: "Le paiement ne s'affiche pas ?",
  modalFallbackCta: "Payer sur la page sécurisée Stripe ↗",
  payOpening: "On prépare ton paiement…",
  retryCta: "Réessayer",
  declineOfferTitle: "Paiement refusé : solde insuffisant",
  declineOfferLead: (name: string, offerPrice: string, price: string) =>
    `Pas de souci : ton 1er mois de formule ${name} passe à ${offerPrice} au lieu de ${price}. Sans engagement.`,
  declineOfferCta: (offerPrice: string) => `Payer ${offerPrice} le 1er mois`,
  firstMonthOfferHeader: (offerPrice: string) => `${offerPrice} le 1er mois`,
  closeOfferTitle: "Attends ! -50 % sur ton 1er mois",
  closeOfferLead: (name: string, offerPrice: string, price: string) =>
    `Ton 1er mois de formule ${name} passe à ${offerPrice} au lieu de ${price}. Sans engagement, résiliable en 1 clic.`,
  closeOfferCta: (offerPrice: string) => `Profiter de -50 % · ${offerPrice}`,
  clipperOfferTitle: "Pas le budget ? Gagne de l'argent",
  clipperOfferLead:
    "Poste des clips Anyloc sur TikTok ou Insta : tu as l'accès gratuit et tu es payé pour tes vidéos. Pas besoin d'abonnés.",
  clipperOfferCta: "Devenir clippeur",
  downgradeNoMobileApp: "L'app iPhone est réservée à la formule 1 an.",
  downsellTitle: (price: string) => `Pas prêt à mettre ${price} d'un coup ?`,
  downsellLead: (name: string, price: string) =>
    `Commence avec la formule ${name} à ${price}, sans engagement. Tu pourras passer sur plus long ensuite.`,
  downsellCta: (price: string) => `Commencer à ${price}`,
  downsellDismiss: "Non merci",
  faq: [
    {
      q: "Y a un essai gratuit ?",
      a:
        "Non, mais tu ne prends aucun risque : si ta loc ne bouge pas sur ton tel, on t'aide en direct sur le chat, et si ça ne marche toujours pas, ton 1er paiement est remboursé (garantie 48 h). Et tu résilies en 1 clic quand tu veux.",
    },
    {
      q: "Ma carte sera débitée tout de suite ?",
      a:
        "Oui. Tu paies à la validation et tu as accès tout de suite. Tu peux annuler en 1 clic depuis ton espace — tu gardes l'accès jusqu'à la fin de la période payée. Si ta loc ne bouge pas, la garantie 48 h te rembourse ton 1er paiement (conditions juste au-dessus).",
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

/** A former subscriber back on the paywall: what changes in the copy. */
export type ReturningCustomer = {
  /** The subscription stopped on a failed payment rather than ending. */
  paymentFailed: boolean;
  previousPlanName: string | null;
};

/** One short line above the plans; picks up the city teleported to in onboarding. */
export function getCheckoutHeadline(city?: string, returning?: ReturningCustomer | null) {
  if (returning) {
    return { before: "Content de te revoir sur", highlight: "Anyloc" };
  }

  if (city) {
    return { before: "Garde ta loc à", highlight: city };
  }

  return { before: "Active", highlight: "Anyloc" };
}

export function getReturningSubline(returning: ReturningCustomer) {
  if (returning.paymentFailed) {
    return "Ton dernier paiement n'est pas passé. Choisis une formule pour retrouver ta loc.";
  }
  const plan = returning.previousPlanName ? ` ${returning.previousPlanName.toLowerCase()}` : "";
  return `Ton abonnement${plan} est terminé. Choisis une formule pour retrouver ta loc.`;
}

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
