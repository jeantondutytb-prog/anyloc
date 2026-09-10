export type LegalPageSection = {
  title: string;
  paragraphs: string[];
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
          "Les tarifs en vigueur sont affichés sur la page Tarification. Les paiements sont traités de manière sécurisée par Stripe. L'abonnement est renouvelé automatiquement à chaque échéance, sauf résiliation préalable depuis ton espace client.",
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
          "Tu peux résilier ton abonnement à tout moment depuis ton espace client. Nous pouvons suspendre ou résilier un compte en cas de violation des présentes CGU.",
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
    description: "Informations légales relatives à l'éditeur du site anyloc.io.",
    path: "/attestation-legale",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        title: "Éditeur du site",
        paragraphs: [
          "Site : anyloc.io",
          "Service : Anyloc",
          "Contact : support@anyloc.io",
          "Email administratif : anyloc.contact@gmail.com",
        ],
      },
      {
        title: "Directeur de la publication",
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
        paragraphs: [
          "Le responsable du traitement des données personnelles est l'éditeur du service Anyloc, joignable à support@anyloc.io.",
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
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        title: "1. Principe général",
        paragraphs: [
          "Anyloc est un service numérique à accès immédiat. Conformément à la réglementation applicable aux contenus numériques, l'accès au service commence dès la validation du paiement.",
        ],
      },
      {
        title: "2. Droit de rétractation",
        paragraphs: [
          "En tant que consommateur, tu disposes d'un délai de 14 jours pour te rétracter. Toutefois, si tu demandes l'activation immédiate du service et que tu commences à l'utiliser, tu reconnais perdre ton droit de rétractation conformément à l'article L221-28 du Code de la consommation.",
        ],
      },
      {
        title: "3. Remboursements exceptionnels",
        paragraphs: [
          "Nous examinons les demandes de remboursement au cas par cas, notamment en cas de dysfonctionnement majeur non résolu par notre support dans un délai raisonnable.",
        ],
        list: [
          "Problème technique empêchant l'accès au service",
          "Double facturation",
          "Erreur de facturation avérée",
        ],
      },
      {
        title: "4. Procédure",
        paragraphs: [
          "Pour toute demande de remboursement, contacte support@anyloc.io en indiquant ton adresse email de compte, la date de paiement et le motif de ta demande. Nous répondons sous 5 jours ouvrés.",
        ],
      },
      {
        title: "5. Modalités",
        paragraphs: [
          "Les remboursements approuvés sont effectués via le même moyen de paiement que celui utilisé lors de l'achat, dans un délai de 5 à 10 jours ouvrés selon ta banque.",
        ],
      },
    ],
  },
  "politique-d-annulation": {
    title: "Politique d'annulation",
    description:
      "Comment résilier ton abonnement Anyloc à tout moment.",
    path: "/politique-d-annulation",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        title: "1. Résiliation libre",
        paragraphs: [
          "Tu peux annuler ton abonnement à tout moment, sans justification ni frais de résiliation. L'annulation prend effet à la fin de la période de facturation en cours : tu conserves l'accès jusqu'à cette date.",
        ],
      },
      {
        title: "2. Comment annuler",
        paragraphs: [
          "Connecte-toi à ton espace client, rends-toi dans Paramètres, puis clique sur « Gérer mon abonnement ». Tu seras redirigé vers le portail Stripe pour confirmer l'annulation en un clic.",
        ],
      },
      {
        title: "3. Effet de l'annulation",
        paragraphs: [
          "Une fois l'annulation confirmée, aucun nouveau prélèvement ne sera effectué. Ton accès reste actif jusqu'à la fin de la période déjà payée.",
        ],
      },
      {
        title: "4. Réabonnement",
        paragraphs: [
          "Tu peux te réabonner à tout moment depuis la page Tarification ou ton espace client. Ton historique et tes paramètres sont conservés tant que ton compte existe.",
        ],
      },
      {
        title: "5. Besoin d'aide ?",
        paragraphs: [
          "Si tu rencontres un problème pour annuler, écris-nous à support@anyloc.io. Nous traitons les demandes sous 48 heures ouvrées.",
        ],
      },
    ],
  },
};

export function getLegalPageContent(slug: string): LegalPageContent | undefined {
  return LEGAL_PAGES[slug];
}
