import { GUARANTEE } from "@/lib/constants";

export type LegalPageField = {
  label: string;
  value?: string;
  pending?: boolean;
};

export type LegalPageSection = {
  title: string;
  paragraphs?: string[];
  fields?: LegalPageField[];
  list?: string[];
};

export type LegalPageContent = {
  title: string;
  description: string;
  path: string;
  lastUpdated: string;
  sections: LegalPageSection[];
};

const LAST_UPDATED = "3 octobre 2026";

export const LEGAL_PAGES: Record<string, LegalPageContent> = {
  "conditions-generales": {
    title: "Conditions générales",
    description:
      "Les présentes conditions régissent l'utilisation du service Anyloc et l'achat d'abonnements sur anyloc.io.",
    path: "/conditions-generales",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        title: "1. Objet",
        paragraphs: [
          "Les présentes conditions générales d'utilisation (ci-après « CGU ») encadrent l'accès et l'utilisation du service Anyloc, accessible via le site anyloc.io et les applications associées.",
          "En créant un compte ou en souscrivant à un abonnement, tu acceptes sans réserve les présentes CGU.",
        ],
      },
      {
        title: "2. Description du service",
        paragraphs: [
          "Anyloc est un service numérique permettant de modifier la localisation GPS affichée par ton appareil sur les applications compatibles. L'accès au service nécessite la création d'un compte et, selon les fonctionnalités, un abonnement payant.",
          "Prérequis matériel : sur iPhone, un ordinateur (Mac ou PC) est obligatoire une fois pour l'installation. Sur Android, aucun ordinateur n'est requis. Ce prérequis est indiqué sur chaque offre avant l'achat ; il t'appartient de le vérifier avant de payer.",
        ],
      },
      {
        title: "3. Compte utilisateur",
        paragraphs: [
          "Tu es responsable de la confidentialité de tes identifiants et de toute activité réalisée depuis ton compte. Tu t'engage à fournir des informations exactes lors de l'inscription.",
        ],
      },
      {
        title: "4. Abonnements et paiement",
        paragraphs: [
          "Les tarifs en vigueur sont affichés sur la page Tarification. Les paiements sont traités de manière sécurisée par Stripe. L'abonnement est renouvelé automatiquement à chaque échéance, sauf résiliation depuis ton espace client.",
          "En cas de résiliation, l'abonnement prend fin immédiatement et l'accès au service est coupé sans délai.",
          "Droit de rétractation : l'accès au service est fourni immédiatement après le paiement. En validant le paiement, tu demandes l'exécution immédiate et renonces expressément à ton droit de rétractation de 14 jours (art. L221-28 13° du code de la consommation). Les sommes payées ne sont donc pas remboursables, hors garantie 48 h décrite dans la politique de remboursement.",
        ],
      },
      {
        title: "5. Utilisation acceptable",
        paragraphs: [
          "Tu t'engage à utiliser Anyloc conformément aux lois applicables et aux conditions des plateformes tierces que tu utilises. Anyloc ne peut être tenu responsable d'une utilisation contraire aux règles d'une application ou d'un service tiers.",
        ],
        list: [
          "Ne pas tenter de contourner les mesures de sécurité du service",
          "Ne pas revendre ou partager ton accès sans autorisation",
          "Ne pas utiliser le service à des fins illicites",
        ],
      },
      {
        title: "6. Propriété intellectuelle",
        paragraphs: [
          "L'ensemble des éléments du site, du logiciel et de la marque Anyloc reste la propriété exclusive de l'éditeur. Aucune licence n'est accordée au-delà de l'usage personnel prévu par le service.",
        ],
      },
      {
        title: "7. Limitation de responsabilité",
        paragraphs: [
          "Anyloc est fourni « en l'état ». Nous mettons tout en œuvre pour assurer la disponibilité du service, sans garantie d'absence d'interruption. Notre responsabilité est limitée au montant payé par l'utilisateur au cours des douze derniers mois.",
        ],
      },
      {
        title: "8. Résiliation",
        paragraphs: [
          "Tu peux résilier ton abonnement à tout moment depuis ton espace client. La résiliation prend effet immédiatement : tu perds l'accès au dashboard, aux guides et aux téléchargements dès confirmation.",
          "Nous pouvons suspendre ou résilier un compte en cas de violation des présentes CGU.",
        ],
      },
      {
        title: "9. Droit applicable",
        paragraphs: [
          "Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents, sous réserve des dispositions légales impératives applicables aux consommateurs.",
        ],
      },
      {
        title: "10. Contact",
        paragraphs: [
          "Pour toute question relative aux présentes conditions : support@anyloc.io",
        ],
      },
    ],
  },
  "politique-de-livraison": {
    title: "Politique de livraison",
    description:
      "Anyloc est un service numérique : l'accès est délivré immédiatement après validation du paiement.",
    path: "/politique-de-livraison",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        title: "1. Nature du service",
        paragraphs: [
          "Anyloc ne vend pas de produits physiques. Il s'agit d'un service numérique d'accès à des fonctionnalités de modification de localisation GPS, accessible via un compte client et, le cas échéant, des applications à installer sur ton appareil.",
        ],
      },
      {
        title: "2. Délai de livraison",
        paragraphs: [
          "L'accès au service est activé immédiatement après confirmation du paiement par Stripe. Tu reçois un email de confirmation et peux accéder à ton espace client sans délai.",
        ],
      },
      {
        title: "3. Contenu livré",
        paragraphs: [
          "La livraison comprend l'activation de ton abonnement, l'accès au dashboard, aux guides d'installation et aux téléchargements associés à ton plan.",
        ],
        list: [
          "Accès immédiat au compte client",
          "Guides d'installation iOS et Android",
          "Téléchargements logiciels selon ton plan",
          "Support par email",
        ],
      },
      {
        title: "4. Problème d'accès",
        paragraphs: [
          "Si tu ne reçois pas l'accès dans les minutes suivant ton paiement, vérifie tes spams puis contacte-nous à support@anyloc.io avec l'adresse email utilisée lors de l'achat.",
        ],
      },
    ],
  },
  "attestation-legale": {
    title: "Attestation légale",
    description:
      "Informations légales relatives à l'éditeur du site anyloc.io. Certaines mentions sont en cours de complétion.",
    path: "/attestation-legale",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        title: "Éditeur du site",
        fields: [
          { label: "Raison sociale", pending: true },
          { label: "Forme juridique", pending: true },
          { label: "SIRET", pending: true },
          { label: "Siège social", pending: true },
          { label: "Capital social", pending: true },
          { label: "Site", value: "anyloc.io" },
          { label: "Service", value: "Anyloc" },
          { label: "Contact", value: "support@anyloc.io" },
        ],
      },
      {
        title: "Directeur de la publication",
        fields: [{ label: "Nom", pending: true }],
        paragraphs: [
          "Le directeur de la publication est le représentant légal de l'éditeur du service Anyloc.",
        ],
      },
      {
        title: "Hébergement",
        paragraphs: [
          "Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.",
        ],
      },
      {
        title: "Traitement des paiements",
        paragraphs: [
          "Les paiements sont traités par Stripe Payments Europe, Ltd. Aucune donnée bancaire complète n'est stockée sur nos serveurs.",
        ],
      },
      {
        title: "Propriété intellectuelle",
        paragraphs: [
          "L'ensemble du contenu du site (textes, visuels, marque, logiciels) est protégé par le droit de la propriété intellectuelle. Toute reproduction non autorisée est interdite.",
        ],
      },
    ],
  },
  "politique-de-confidentialite": {
    title: "Politique de confidentialité",
    description:
      "Comment Anyloc collecte, utilise et protège tes données personnelles.",
    path: "/politique-de-confidentialite",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        title: "1. Responsable du traitement",
        fields: [
          { label: "Raison sociale", pending: true },
          { label: "Contact", value: "support@anyloc.io" },
        ],
        paragraphs: [
          "Le responsable du traitement des données personnelles est l'éditeur du service Anyloc.",
        ],
      },
      {
        title: "2. Données collectées",
        paragraphs: [
          "Nous collectons uniquement les données nécessaires au fonctionnement du service :",
        ],
        list: [
          "Adresse email et identifiants de connexion",
          "Informations de facturation (via Stripe)",
          "Données techniques (navigateur, appareil, logs de connexion)",
          "Préférences et paramètres de ton compte",
        ],
      },
      {
        title: "3. Finalités du traitement",
        paragraphs: [
          "Tes données sont utilisées pour créer et gérer ton compte, traiter les paiements, fournir le support client, améliorer le service et respecter nos obligations légales.",
        ],
      },
      {
        title: "4. Base légale",
        paragraphs: [
          "Le traitement repose sur l'exécution du contrat (fourniture du service), ton consentement lorsque requis, et nos intérêts légitimes (sécurité, amélioration du produit).",
        ],
      },
      {
        title: "5. Durée de conservation",
        paragraphs: [
          "Les données de compte sont conservées pendant la durée de la relation contractuelle, puis archivées conformément aux obligations légales. Les données de facturation sont conservées selon les durées légales applicables.",
        ],
      },
      {
        title: "6. Sous-traitants",
        paragraphs: [
          "Nous faisons appel à des prestataires de confiance : Stripe (paiements), Supabase (authentification et base de données), Vercel (hébergement). Ces prestataires traitent les données uniquement pour nos besoins.",
        ],
      },
      {
        title: "7. Tes droits",
        paragraphs: [
          "Conformément au RGPD, tu disposes d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Pour exercer tes droits : support@anyloc.io.",
          "Tu peux également introduire une réclamation auprès de la CNIL.",
        ],
      },
      {
        title: "8. Cookies",
        paragraphs: [
          "Le site utilise des cookies techniques nécessaires au fonctionnement (session, authentification). Aucun cookie publicitaire tiers n'est déposé sans ton consentement.",
        ],
      },
    ],
  },
  "politique-de-remboursement": {
    title: "Politique de remboursement",
    description:
      "Garantie 48 h : si ta position ne change pas malgré l'aide du support, Anyloc te rembourse ton premier paiement.",
    path: "/politique-de-remboursement",
    lastUpdated: "4 octobre 2026",
    sections: [
      {
        title: "1. La garantie « Ta loc bouge pas ? On te rembourse. »",
        paragraphs: [
          "Anyloc s'engage à te rembourser l'intégralité de ton premier paiement si, une fois ton téléphone connecté à ton compte, sa position GPS ne change pas, que tu le prouves en vidéo et que notre support ne parvient pas à corriger le problème.",
          "Cette garantie est un engagement commercial volontaire : c'est la voie de remboursement ouverte par Anyloc, l'accès étant fourni immédiatement (voir le point 5).",
        ],
      },
      {
        title: "2. Conditions à remplir",
        paragraphs: [
          "Les conditions suivantes sont cumulatives. Elles sont accessibles depuis la page de paiement, avant l'achat (lien « Voir les conditions » de la garantie).",
        ],
        list: GUARANTEE.conditions.map((condition) => `${condition.t} : ${condition.d}`),
      },
      {
        title: "3. Comment faire la demande",
        paragraphs: [
          "Écris à support@anyloc.io depuis l'adresse email de ton compte, avec le modèle de ton téléphone et la vidéo d'écran décrite au point 2 (en pièce jointe ou en lien). Le support essaie d'abord de régler le problème avec toi.",
          "Nous vérifions de notre côté que ton appareil est bien connecté à ton compte et à quel moment ta position a été modifiée. Nous répondons sous 72 heures.",
        ],
      },
      {
        title: "4. Ce qui n'ouvre pas droit au remboursement",
        list: [
          "Une demande faite plus de 48 heures après le premier paiement.",
          "Un abonnement résilié avant la demande.",
          "Un téléphone jamais connecté à ton compte (installation non terminée), y compris faute d'ordinateur pour installer Anyloc sur iPhone.",
          "Une demande sans vidéo d'écran, ou avec une vidéo coupée, montée, ou où l'heure n'est pas visible.",
          "Une demande faite sans avoir testé les solutions proposées par le support.",
          "Une demande alors que les données de ton compte montrent que la position a bien été appliquée sur ton appareil.",
          "Un changement d'avis, ou l'achat d'une solution similaire ailleurs.",
          "Une restriction propre à une application tierce alors que la position du téléphone a bien changé (visible dans Plans ou Google Maps).",
          "Les échéances de renouvellement : la garantie porte uniquement sur ton premier paiement. Tu pouvais résilier à tout moment avant l'échéance, et le service est resté disponible pendant toute la période payée.",
        ],
      },
      {
        title: "5. Rétractation : pourquoi les 14 jours ne s'appliquent pas",
        paragraphs: [
          "Anyloc est un service numérique fourni immédiatement : dès le paiement validé, l'accès au service, au dashboard et aux téléchargements est ouvert, sans attente ni livraison.",
          "Le code de la consommation prévoit expressément cette exception (art. L221-28, 13°). En validant ton paiement, tu demandes cette exécution immédiate et tu renonces expressément à ton droit de rétractation de 14 jours. Cette mention figure dans le formulaire de paiement, juste au-dessus du bouton de paiement.",
          "C'est la garantie 48 h du point 1 qui te protège : elle est plus rapide, et c'est notre engagement propre.",
        ],
      },
      {
        title: "6. Ce qui reste toujours remboursé",
        paragraphs: [
          "Indépendamment de la garantie, les situations suivantes sont toujours régularisées :",
        ],
        list: [
          "Double prélèvement ou erreur de facturation de notre part.",
          "Renouvellement débité alors que tu avais résilié avant l'échéance.",
          "Défaut de conformité : si le service ne fonctionne pas comme décrit et que nous ne parvenons pas à le corriger, tu conserves les droits de la garantie légale de conformité des contenus et services numériques (art. L224-25-12 et suivants du code de la consommation).",
        ],
      },
      {
        title: "7. Modalités de remboursement",
        paragraphs: [
          "Le remboursement est effectué par Stripe sur le moyen de paiement d'origine, sous 14 jours à compter de l'acceptation de la demande. Un remboursement au titre de la garantie met fin à l'abonnement et à l'accès au service.",
        ],
      },
      {
        title: "8. Résiliation de l'abonnement",
        paragraphs: [
          "Ton abonnement se renouvelle automatiquement au prix indiqué avant l'achat. Tu peux le résilier à tout moment depuis ton espace client (Paramètres → Résilier mon abonnement), sans frais.",
          "Attention : la résiliation prend effet immédiatement. Tu perds l'accès au service, au dashboard et aux téléchargements dès confirmation. Aucun remboursement au prorata n'est effectué pour la période en cours, et résilier met fin à la garantie 48 h.",
        ],
      },
    ],
  },
  "politique-d-annulation": {
    title: "Politique d'annulation",
    description:
      "Comment résilier ton abonnement Anyloc et ce qui se passe ensuite.",
    path: "/politique-d-annulation",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        title: "1. Résiliation libre",
        paragraphs: [
          "Tu peux annuler ton abonnement à tout moment, sans justification ni frais de résiliation.",
          "Important : l'annulation prend effet immédiatement. Tu n'as plus accès au service, au dashboard, aux guides d'installation ni aux téléchargements dès que tu confirmes la résiliation.",
        ],
      },
      {
        title: "2. Avant de résilier",
        paragraphs: [
          "Assure-toi d'avoir bien compris les conséquences avant de confirmer :",
        ],
        list: [
          "Ton accès est coupé sur-le-champ, pas à la fin de la période payée.",
          "Tu perds l'accès aux fonctionnalités GPS, au dashboard et aux téléchargements.",
          "La période en cours n'est pas remboursée, même partiellement.",
        ],
      },
      {
        title: "3. Comment annuler",
        paragraphs: [
          "Connecte-toi à ton espace client, rends-toi dans Paramètres, puis clique sur « Résilier mon abonnement ». Un rappel des conséquences s'affiche avant redirection vers le portail Stripe pour confirmer.",
        ],
      },
      {
        title: "4. Effet de l'annulation",
        paragraphs: [
          "Une fois l'annulation confirmée, aucun nouveau prélèvement ne sera effectué et ton accès est immédiatement révoqué. Aucun remboursement au prorata n'est effectué pour la période en cours.",
        ],
      },
      {
        title: "5. Réabonnement",
        paragraphs: [
          "Tu peux te réabonner à tout moment depuis la page Tarification ou ton espace client. Ton compte est conservé, mais tu devras souscrire à nouveau pour retrouver l'accès.",
        ],
      },
      {
        title: "6. Besoin d'aide ?",
        paragraphs: [
          "Si tu rencontres un problème technique, contacte support@anyloc.io avant de résilier — notre équipe peut t'aider à finaliser l'installation.",
        ],
      },
    ],
  },
};

export function getLegalPageContent(slug: string): LegalPageContent | undefined {
  return LEGAL_PAGES[slug];
}
