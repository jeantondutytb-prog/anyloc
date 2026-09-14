export const LOCAFLEX_CHECKOUT_COPY = {
  scarcity: "Accès immédiat · résiliable en 1 clic",
  h1a: "Débloque ta téléportation.",
  h1b: "Change de ville en 30 secondes.",
  subA: "Pas un screenshot, pas un montage : ta ",
  subHl: "vraie position système",
  subB: ", en direct. Ton accès se débloque à la seconde.",
  valueTitle: "Ce que tu débloques aujourd'hui",
  included: [
    {
      t: "Le monde entier comme terrain de jeu",
      d: "Dubaï ce soir, Miami demain — pose ton point où tu veux, en direct.",
    },
    {
      t: "Une position que personne peut griller",
      d: "C'est ta vraie position système, pas un screenshot ni un montage.",
    },
    {
      t: "Guidé pas à pas, pour ton modèle",
      d: "Une vraie app sur ton tel : Android inclus, iPhone avec la formule 1 an.",
    },
    {
      t: "Zéro engagement",
      d: "Résiliation en 1 clic, quand tu veux, sans avoir à te justifier.",
    },
  ],
  selectTitle: "Choisis ta formule",
  selectSub:
    "Le flex ne vaut que s'il est permanent — plus tu prends long, moins tu payes.",
  guaranteeBadge: "Satisfait ou remboursé",
  perksTitle: "Ce que ta formule inclut",
  bumpHeadline: "Ajoute le Pack Voyageur",
  bumpPrice: "15,90 €",
  bumpRecommended: "Recommandé",
  bumpBlurb:
    "Pour que personne ne se doute de rien : tes trajets ont l'air 100% vrais (avion près d'un aéroport, bateau en mer, voiture, train près d'une gare…). Plus la carte des 50 meilleurs spots — hôtels de luxe, aéroports, restos, monuments.",
  bumpNudge:
    "La plupart l'ajoutent : c'est la différence entre une position posée et un vrai déplacement.",
  payOpening: "Ouverture du paiement…",
  updating: "Mise à jour du montant…",
  trust: [
    "🔒 Paiement sécurisé",
    "· Annulation en 1 clic",
    "· Accès débloqué à la seconde",
  ],
  reassure: [
    "Paiement 100% sécurisé",
    "Annulation en 1 clic, sans justificatif",
    "Accès immédiat après paiement",
  ],
  secureTitle: "Paiement 100% sécurisé",
  ssl: "Certificat SSL · chiffré 256 bits · via Stripe",
  recapUnlock:
    "Tu débloques : téléportation illimitée partout · ta vraie position système (pas un screenshot) · installation guidée pas à pas.",
  consent:
    "En payant, tu acceptes les {cgv} et tu demandes l'accès immédiat au service. Tu renonces alors à ton droit de rétractation de 14 jours dès que le service a commencé (téléchargement ou accès débloqué).",
  consentCgv: "conditions générales",
  guarantee:
    "Ça marche sur ton téléphone, ou on te rembourse. On te met en route en direct si besoin. Annulable en 1 clic.",
  faqTitle: "Avant de valider",
  faq: [
    {
      q: "Ça marche sur mon téléphone ?",
      a:
        "Oui — iPhone comme Android, tous modèles. Sur Android tout se fait depuis ton tel. Sur iPhone, la formule 1 an t'envoie l'app sur ton tel : une mise en route de quelques minutes, une seule fois, guidée pas à pas, puis tout se passe depuis ton téléphone. En 6 mois, ton iPhone se pilote depuis le logiciel sur ton ordi, fourni aussi. Et si ça marche pas sur ton modèle, on te rembourse.",
    },
    {
      q: "On va me griller ?",
      a:
        "Non. C'est pas un screenshot ni un montage : c'est ta vraie position système, en direct — exactement ce que ton téléphone envoie à la map. Tes potes voient un vrai pin, au bon endroit.",
    },
    {
      q: "Et si je veux arrêter ?",
      a:
        "Résiliation en 1 clic depuis ton espace, quand tu veux, sans justif. Pas de relance, pas d'appel, pas de formulaire.",
    },
  ],
  proofTitle: "Pas un montage. La preuve. ⤵",
  proofSub:
    "La même position sur la map sociale ET sur la carte système. Le même point, partout.",
  reviewsTitle: "Ce qu'en disent les abonnés",
  reviewsVerified: "Client vérifié",
  errGeneric: "Une erreur est survenue.",
  errStart: "Impossible de démarrer le paiement.",
} as const;

export const LOCAFLEX_CHECKOUT_PLAN_IDS = ["6months", "annual"] as const;

export const LOCAFLEX_BASE_PERKS = [
  "Téléportation partout dans le monde, en direct",
  "Ta vraie position système — aucun montage",
  "Change de ville autant de fois que tu veux",
  "Logiciel PC et Mac inclus, app Android en autonome",
  "Installation guidée pas à pas",
  "Résiliation en 1 clic, sans justif",
] as const;

export const LOCAFLEX_ANNUAL_EXTRA_PERKS = [
  "L'app iPhone native, envoyée sur ton tel dès l'activation — tu changes de ville depuis ton lit",
  "Tu changes de ville depuis ton tel, où que tu sois",
  "Tarif bloqué 12 mois",
  "La carte des 10 spots qui font le plus « il est où lui ?? »",
] as const;

export const LOCAFLEX_PROOF_IMAGES = [
  {
    src: "https://www.locaflex.io/proof/map-dubai.jpg",
    city: "Dubaï — Burj Khalifa",
    kind: "map" as const,
  },
  {
    src: "https://www.locaflex.io/proof/sys-dubai-downtown.jpg",
    city: "Dubaï",
    kind: "system" as const,
  },
  {
    src: "https://www.locaflex.io/proof/map-tokyo.jpg",
    city: "Tokyo",
    kind: "map" as const,
  },
  {
    src: "https://www.locaflex.io/proof/sys-tokyo.jpg",
    city: "Tokyo",
    kind: "system" as const,
  },
  {
    src: "https://www.locaflex.io/proof/snap-miami.jpg",
    city: "Miami",
    kind: "map" as const,
  },
  {
    src: "https://www.locaflex.io/proof/karte-marina.jpg",
    city: "Dubai Marina",
    kind: "system" as const,
  },
  {
    src: "https://www.locaflex.io/proof/karte-zurich.jpg",
    city: "Zürich",
    kind: "system" as const,
  },
  {
    src: "https://www.locaflex.io/proof/snap-monaco.jpg",
    city: "Monte-Carlo",
    kind: "map" as const,
  },
] as const;

export const LOCAFLEX_REVIEWS = [
  {
    name: "Yanis",
    text: "Tout marche parfaitement merci LocaFlex!!",
    stars: 5,
  },
  {
    name: "Mehdi",
    text:
      "C'est tout bon sur iPhone c'était vraiment simple avec les étapes à suivre",
    stars: 5,
  },
  {
    name: "Théo",
    text:
      "Je pensais j'allais galerer mais au final c'etais super rapide merci encore",
    stars: 5,
  },
  {
    name: "Sofiane",
    text:
      "C'est parfait tout le monde crois que je suis a Dubai depuis la semaine dernière haha merci Locaflex",
    stars: 5,
  },
  {
    name: "Rayan",
    text:
      "Mes potes font que de me demander je suis parti quand a Phuket mdr ca marche vraiment",
    stars: 5,
  },
  {
    name: "Killian",
    text:
      "Je me suis mis a Miami depuis hier et mon ex fait que de m'envoyer des messages haha",
    stars: 5,
  },
  {
    name: "Adam",
    text: "C'étais super simple a utiliser sur mon iPhone je recommandes",
    stars: 5,
  },
  {
    name: "Inès",
    text:
      "Mes copines que elles me disent depuis quand je suis en Amérique merci LocaFlex",
    stars: 5,
  },
] as const;
