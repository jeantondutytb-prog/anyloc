import { PLAN_IDS } from "@/lib/constants";

export const CHECKOUT_COPY = {
  selectTitle: "Choisis ta durée",
  selectSub:
    "Essaie gratuitement sur tous les plans — même accès complet sur Snap, Insta, Tinder et toutes tes apps. Seule la durée facturée change après l'essai.",
  payOpening: "On prépare ton essai gratuit…",
  updating: "Mise à jour du plan…",
  consent:
    "En validant, tu acceptes nos {cgv}. Gère ton abonnement depuis ton espace client.",
  consentCgv: "conditions générales",
  destinationLabel: "Ta prochaine loc",
  canceled:
    "Paiement annulé. Reprends quand tu veux — ton plan reste sélectionné.",
  retryCta: "Essayer gratuitement",
  backCta: "Changer de destination",
  errGeneric: "Une erreur est survenue. Réessaie dans quelques instants.",
  errStart: "Impossible de démarrer l'essai.",
} as const;

export const CHECKOUT_PLAN_IDS = PLAN_IDS;
