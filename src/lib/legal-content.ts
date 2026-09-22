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

const LAST_UPDATED = "10 septembre 2026";

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
      "Conditions de remboursement des abonnements Anyloc.",
    path: "/politique-de-remboursement",
    lastUpdated: "22 septembre 2026",
    sections: [
      {
        title: "Politique de remboursement",
        paragraphs: [
          "Sauf lorsque la loi applicable l'exige, notamment la législation de protection des consommateurs en vigueur dans ton pays, tous les frais d'abonnement payés sont non remboursables.",
          "Rien dans la présente section ne limite les droits de remboursement, d'annulation, de contestation de prélèvement ou de consommation qui ne peuvent pas être exclus en vertu de la loi applicable.",
          "Pour le détail des conditions d'abonnement et de facturation, consulte nos conditions générales.",
        ],
      },
      {
        title: "Avertissements",
        list: [
          "Tu ne peux utiliser Anyloc qu'à des fins licites. Toute responsabilité liée à une utilisation contraire à la loi t'incombe.",
          "Anyloc ne prétend pas être exempt d'erreurs. Nous visons un service de qualité, mais des bugs peuvent survenir dans le logiciel ou sur le site.",
          "Anyloc est réservé à un usage personnel.",
          "Anyloc peut masquer ta localisation auprès de tes proches. Toute responsabilité liée à ce masquage t'incombe.",
          "Anyloc n'est pas responsable des pertes de données pouvant résulter de l'utilisation du service.",
        ],
      },
      {
        title: "Contact",
        paragraphs: [
          "Pour toute question, commentaire ou réclamation, écris-nous à support@anyloc.io.",
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
          "Les frais d'abonnement déjà payés ne sont pas remboursables (sauf droits légaux impératifs — voir la politique de remboursement).",
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
