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
          "Tu es responsable de la confidentialité de tes identifiants et de toute activité réalisée depuis ton compte. Tu t'engages à fournir des informations exactes lors de l'inscription.",
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
          "Tu t'engages à utiliser Anyloc conformément aux lois applicables et aux conditions des plateformes tierces que tu utilises. Anyloc ne peut être tenu responsable d'une utilisation contraire aux règles d'une application ou d'un service tiers.",
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
      "Conditions de remboursement et garantie commerciale Anyloc.",
    path: "/politique-de-remboursement",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        title: "1. La garantie « pas de résultat en 48 h »",
        paragraphs: [
          "Anyloc s'engage à te rembourser l'intégralité de la somme payée si, après avoir suivi la méthode d'installation et testé le service pendant 48 heures, tu n'as pas réussi à modifier ta localisation GPS sur au moins une application compatible (Snapchat, Instagram, Tinder, jeu mobile, etc.).",
          "Cette garantie est un engagement commercial volontaire. Elle s'ajoute à tes droits légaux, elle ne les remplace pas — voir le point 5.",
        ],
      },
      {
        title: "2. Conditions à remplir",
        paragraphs: [
          "Les trois conditions suivantes sont cumulatives. Elles sont affichées sur la page de tarifs, avant l'achat.",
        ],
        list: [
          "Installation complète : tu dois avoir suivi l'intégralité du guide d'installation correspondant à ton appareil (iOS ou Android), disponible dans ton espace client, et appliqué chaque étape requise.",
          "Délai : la demande doit être faite dans les 48 heures suivant ton achat. Passé ce délai, la garantie ne s'applique plus.",
          "Abonnement actif : tu ne dois pas avoir résilié ton abonnement avant d'avoir fait la demande. Une résiliation vaut renoncement à cette garantie.",
        ],
      },
      {
        title: "3. Comment faire la demande",
        paragraphs: [
          "Envoie un message à support@anyloc.io depuis l'adresse email de ton compte, en précisant ton appareil (iOS / Android, modèle si possible), les applications testées et l'étape à laquelle tu es bloqué.",
          "Notre équipe peut te demander des captures d'écran pour vérifier que l'installation a bien été suivie. Nous répondons sous 72 heures.",
        ],
      },
      {
        title: "4. Ce qui n'ouvre pas droit au remboursement",
        paragraphs: [
          "Les cas suivants n'ouvrent pas droit au remboursement au titre de la garantie commerciale :",
        ],
        list: [
          "Une demande faite après le délai de 48 heures (hors droit de rétractation légal, voir point 5).",
          "Un abonnement résilié avant la demande.",
          "Une installation incomplète ou non conforme au guide (mode développeur non activé, VPN non configuré sur iOS, etc.).",
          "Un blocage lié à une restriction de l'appareil ou de l'application tierce indépendant d'Anyloc.",
          "Une simple insatisfaction après utilisation réussie du service (localisation modifiée et fonctionnelle).",
        ],
      },
      {
        title: "5. Ton droit de rétractation légal",
        paragraphs: [
          "Indépendamment de la garantie ci-dessus, le droit français t'accorde un délai de rétractation de 14 jours pour les achats à distance (art. L221-18 du code de la consommation).",
          "Pour un contenu numérique fourni immédiatement, ce droit s'éteint uniquement si tu as expressément consenti à l'exécution immédiate et renoncé à ta rétractation. En l'absence d'un tel consentement, tu conserves ces 14 jours sans condition — les conditions du point 2 ne s'y appliquent pas.",
          "Autrement dit : la garantie « 48 h » est un bonus commercial plus rapide mais conditionné ; le droit de rétractation reste ton filet de sécurité inconditionnel.",
        ],
      },
      {
        title: "6. Modalités de remboursement",
        paragraphs: [
          "Les paiements sont encaissés par Stripe. Le remboursement est effectué sur le moyen de paiement d'origine, sous 14 jours à compter de l'acceptation de la demande.",
        ],
      },
      {
        title: "7. Résiliation de l'abonnement",
        paragraphs: [
          "Ton abonnement se renouvelle automatiquement au prix indiqué avant l'achat. Tu peux le résilier à tout moment depuis ton espace client (Paramètres → Résilier mon abonnement), sans frais.",
          "Attention : la résiliation prend effet immédiatement. Tu perds l'accès au service, au dashboard et aux téléchargements dès confirmation. Aucun remboursement au prorata n'est effectué pour la période en cours.",
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
          "Si tu envisages une demande de remboursement au titre de la garantie « 48 h », fais-la avant de résilier — une résiliation vaut renoncement à cette garantie.",
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
