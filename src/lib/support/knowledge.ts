import { FAQ, GUARANTEE, PLANS, PLAN_VALUE_STACK } from "@/lib/constants";
import { LEGAL_PAGES } from "@/lib/legal-content";
import type { LegalPageContent } from "@/lib/legal-content";

/**
 * Hand-written support knowledge: what the site's own copy doesn't say.
 * Edit this when a new recurring question shows up in Crisp.
 */
const SUPPORT_PLAYBOOK = `
## Comment Anyloc marche (à expliquer simplement)
- Anyloc change la position GPS du téléphone au niveau du système : toutes les apps qui lisent le GPS (Snapchat, Instagram, Tinder, Bumble, Life360, Pokémon GO…) voient la nouvelle position.
- Le client choisit sa position sur le dashboard (anyloc.io/dashboard) ou dans l'app, et l'active.
- Pas de jailbreak, pas de root.

## Installation
- Tout passe par l'app ordinateur « Anyloc Setup », à télécharger depuis le dashboard (anyloc.io/dashboard), sur Mac ou PC Windows. Elle guide pas à pas : branchement USB du téléphone, installation, première ville.
- iPhone : un Mac ou un PC est obligatoire une seule fois, à la première installation (limite Apple). Il faut activer le mode développeur sur l'iPhone (Réglages → Confidentialité et sécurité → Mode développeur, puis redémarrer). Ensuite, installer LocalDevVPN sur l'iPhone, connecter le VPN en Wi-Fi, puis ouvrir Anyloc : tout se gère depuis le téléphone, sans rebrancher l'ordinateur.
- Formule 1 an : l'app iPhone s'installe directement depuis le téléphone, sans ordinateur (page « L'app Anyloc sur ton iPhone » du dashboard : bouton « Préparer mon iPhone », puis 2 à 5 minutes de préparation, puis « Installer »).
- Android : quelques réglages sur le téléphone (options développeur, application de position fictive), expliqués dans Anyloc Setup et le dashboard.
- Pas d'ordinateur du tout et un iPhone sans la formule 1 an : l'installation n'est pas possible. Le dire honnêtement, surtout avant l'achat.

## Problèmes fréquents et réponses
- Mac : « Anyloc ne peut pas être ouvert » / développeur non identifié → Réglages Système → Confidentialité et sécurité → descendre tout en bas → « Ouvrir quand même », puis taper le mot de passe du Mac. Une seule fois.
- Windows : Chrome ou Edge dit « Faites attention » → cliquer la petite flèche à droite du fichier puis « Conserver ». Écran bleu « Windows a protégé votre ordinateur » → « Informations complémentaires » puis « Exécuter quand même ». Ce n'est pas un virus : Windows l'affiche pour toutes les apps hors Microsoft Store.
- iPhone non détecté par l'ordinateur → câble d'origine (pas un câble de charge seule), déverrouiller l'iPhone, appuyer « Se fier à cet ordinateur », essayer un autre port USB, redémarrer Anyloc Setup.
- Mode développeur introuvable sur iPhone → il n'apparaît qu'après le premier branchement à Anyloc Setup. Brancher, puis regarder à nouveau dans Réglages → Confidentialité et sécurité.
- La position ne change pas sur iPhone → vérifier que le VPN LocalDevVPN est connecté (Wi-Fi activé), que l'app Anyloc est ouverte et la position activée, puis fermer complètement l'app concernée (Snap, etc.) et la rouvrir. Tester d'abord dans Plans.
- La position ne change pas sur Android → vérifier qu'Anyloc est bien choisie comme « application de position fictive » dans les options développeur, et que la localisation est en mode « haute précision ».
- Une app affiche encore l'ancienne position → fermer l'app de force et la rouvrir ; certaines apps gardent la dernière position en cache quelques minutes.
- Test de référence : ouvrir Plans (iPhone) ou Google Maps (Android). Si la carte montre la nouvelle position, Anyloc marche ; un souci restant vient de l'app tierce.

## Compte et abonnement
- Le client gère tout seul son abonnement dans son espace : anyloc.io/dashboard → Paramètres. Il peut y changer de formule, mettre à jour sa carte, télécharger ses factures, résilier, ou annuler une résiliation.
- Mot de passe oublié → page de connexion anyloc.io/login → « Mot de passe oublié ».
- Résiliation : effet à la fin de la période payée, accès conservé jusque-là, pas de remboursement au prorata.
`;

function formatLegalPage(page: LegalPageContent) {
  return page.sections
    .map((section) => {
      const lines = [`### ${section.title}`, ...(section.paragraphs ?? [])];
      for (const item of section.list ?? []) {
        lines.push(`- ${item}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function formatPlans() {
  return PLANS.map(
    (plan) =>
      `- ${plan.name} (grille ${plan.grid}) : ${plan.price}${plan.period}. ${plan.description}${
        plan.mobileApp ? " Inclut l'app iPhone sans ordinateur." : ""
      }`
  ).join("\n");
}

/**
 * The agent's reference material. Built from the same constants the site
 * renders, so prices, guarantee and refund terms never drift from the site.
 * Deterministic on purpose: it sits in the cached prompt prefix.
 */
export function buildSupportKnowledge() {
  const refund = LEGAL_PAGES["politique-de-remboursement"];
  const cancellation = LEGAL_PAGES["politique-d-annulation"];

  return [
    "# Base de connaissances Anyloc",
    SUPPORT_PLAYBOOK.trim(),
    "## Offres",
    "Deux grilles de prix coexistent (test A/B) : ne cite pas un prix précis sauf si le client le demande, et renvoie alors vers anyloc.io/pricing pour le prix qui lui est proposé.",
    formatPlans(),
    `Inclus dans toutes les formules : ${PLAN_VALUE_STACK.join(" ; ")}.`,
    "## FAQ du site",
    FAQ.map((item) => `- ${item.q} → ${item.a}`).join("\n"),
    `## ${GUARANTEE.badge} : ${GUARANTEE.title}`,
    GUARANTEE.summary,
    GUARANTEE.conditions.map((condition) => `- ${condition.t} : ${condition.d}`).join("\n"),
    `## ${refund.title}`,
    formatLegalPage(refund),
    `## ${cancellation.title}`,
    formatLegalPage(cancellation),
  ].join("\n\n");
}
