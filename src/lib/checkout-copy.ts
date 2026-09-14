import { PAYWALL_TESTIMONIALS, PLAN_VALUE_STACK, SITE } from "@/lib/constants";

export const CHECKOUT_REVIEWS = PAYWALL_TESTIMONIALS.map((testimonial) => ({
  name: testimonial.author,
  stars: 5,
  text: testimonial.quote,
  city: testimonial.city,
}));

export const CHECKOUT_COPY = {
  scarcity: "Essai gratuit · résiliable en 1 clic",
  h1a: "Fake ta loc.",
  h1b: SITE.tagline,
  subA: `${SITE.description} Pas un screenshot, pas un montage : ta `,
  subHl: "vraie position GPS",
  subB: ", en direct. Ton accès se débloque dès la validation.",
  valueTitle: "Ce que tu débloques aujourd'hui",
  included: [
    {
      t: "Snap, Insta, Tinder — tout le tel",
      d: "Une seule loc pour toutes tes apps, pas une par une.",
    },
    {
      t: "Une position que personne peut griller",
      d: "Signal GPS réel, pas un screenshot ni un montage.",
    },
    {
      t: "Guidé pas à pas, pour ton modèle",
      d: "Android depuis le mobile. iPhone avec la formule annuelle.",
    },
    {
      t: "Zéro engagement",
      d: "Résiliation en 1 clic, quand tu veux, sans justificatif.",
    },
  ],
  selectTitle: "Choisis ta formule",
  selectSub:
    "Tous les plans incluent le même accès — plus tu prends long, moins tu payes.",
  guaranteeBadge: "Garantie 48 h",
  perksTitle: "Ce que ta formule inclut",
  bumpHeadline: "Ajoute le Pack Spots Premium",
  bumpPrice: "9,90 €",
  bumpRecommended: "Recommandé",
  bumpBlurb:
    "La carte des meilleurs spots — hôtels, aéroports, restos, monuments — pour des positions crédibles partout.",
  bumpNudge:
    "La plupart l'ajoutent : ça fait la différence entre une loc posée et un vrai déplacement.",
  payOpening: "Préparation du checkout Stripe…",
  updating: "Mise à jour de la formule…",
  trust: [
    "🔒 Paiement sécurisé",
    "· Annulation en 1 clic",
    "· Accès débloqué à la seconde",
  ],
  reassure: [
    "Paiement 100% sécurisé",
    "Annulation en 1 clic, sans justificatif",
    "Accès immédiat après validation",
  ],
  secureTitle: "Paiement 100% sécurisé",
  ssl: "SSL · chiffrement 256 bits · Stripe",
  recapUnlock:
    "Tu débloques : loc illimitée sur toutes tes apps · signal GPS réel · installation guidée pas à pas.",
  consent:
    "En validant, tu acceptes nos {cgv}. Gère ton abonnement depuis ton espace client.",
  consentCgv: "conditions générales",
  guarantee:
    "Ça marche sur ton téléphone, ou on te rembourse sous 48 h. Annulable en 1 clic.",
  faqTitle: "Avant de valider",
  faq: [
    {
      q: "Ça marche sur mon téléphone ?",
      a:
        "Oui — iPhone et Android. Sur Android tout se fait depuis ton tel. Sur iPhone, la formule annuelle inclut l'app native : une mise en route guidée de quelques minutes, puis tout depuis ton téléphone.",
    },
    {
      q: "On va me griller ?",
      a:
        "Non. C'est pas un screenshot : c'est ta vraie position GPS, en direct — exactement ce que ton téléphone envoie à Snap, Insta et Tinder.",
    },
    {
      q: "Et si je veux arrêter ?",
      a:
        "Résiliation en 1 clic depuis ton espace, quand tu veux, sans justificatif.",
    },
  ],
  proofTitle: "Pas un montage. La preuve.",
  proofSub:
    "La même position sur la map sociale ET sur le GPS système. Le même point, partout.",
  reviewsTitle: "Ce qu'en disent les abonnés",
  reviewsVerified: "Client vérifié",
  errGeneric: "Une erreur est survenue. Réessaie dans quelques instants.",
  errStart: "Impossible de démarrer le paiement.",
} as const;

export const CHECKOUT_PLAN_IDS = ["6months", "annual"] as const;

export const CHECKOUT_BASE_PERKS = PLAN_VALUE_STACK;

export const CHECKOUT_ANNUAL_EXTRA_PERKS = [
  "App iPhone incluse — change de ville depuis ton lit",
  "Tarif bloqué 12 mois",
  "Meilleur prix sur l'année",
] as const;

export const CHECKOUT_PROOF_IMAGES = [
  {
    src: "/proof/snap-dubai.png",
    city: "Dubaï — Burj Khalifa",
    kind: "map" as const,
  },
  {
    src: "/proof/sys-paris.png",
    city: "Paris — Tour Eiffel",
    kind: "system" as const,
  },
  {
    src: "/proof/snap-miami.png",
    city: "Miami Beach",
    kind: "map" as const,
  },
  {
    src: "/proof/sys-tokyo.png",
    city: "Tokyo — Shibuya",
    kind: "system" as const,
  },
  {
    src: "/proof/snap-new-york.png",
    city: "New York",
    kind: "map" as const,
  },
  {
    src: "/proof/sys-rio.png",
    city: "Rio de Janeiro",
    kind: "system" as const,
  },
] as const;
