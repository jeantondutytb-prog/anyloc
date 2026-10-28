import { FAQ, GUARANTEE, PLANS, PLAN_VALUE_STACK } from "@/lib/constants";
import { LEGAL_PAGES } from "@/lib/legal-content";
import type { LegalPageContent } from "@/lib/legal-content";

/**
 * Hand-written support knowledge: what the site's own copy doesn't say.
 * Edit this when a new recurring question shows up in Crisp.
 */
const SUPPORT_PLAYBOOK = `
## Les questions qu'on reçoit le plus (réponses validées par Jean)
- « C'est payant ? » / « Je suis obligé de payer ? » / « Je veux pas payer » → Oui, Anyloc est un abonnement, sans engagement et résiliable en 1 clic. Pas de version gratuite. Ce qui rassure : la garantie 48 h (si la loc ne bouge pas malgré notre aide, le 1er paiement est remboursé). Les prix sont sur anyloc.io/pricing.
- « Je peux avoir un essai gratuit ? » → Non, pas d'essai gratuit. Mais aucun risque grâce à la garantie 48 h, et on aide en direct sur le chat jusqu'à ce que ça marche.
- « Comment je change ma loc (Snap, etc.) ? » → Tu crées ton compte sur anyloc.io, tu choisis ta formule, puis tu installes Anyloc sur ton tel (étapes ci-dessous). Ensuite tu choisis une ville dans l'app ou sur ton espace, et toutes tes apps (Snap, Insta, Tinder…) voient la nouvelle position.
- « Snap ou Tinder peuvent me détecter ou me bannir ? » → Anyloc change la position au niveau du système du téléphone, pas dans l'app : Snap ou Tinder reçoivent un signal GPS normal, comme si tu étais vraiment sur place. On n'a eu aucun cas de bannissement. Ne promets jamais un risque zéro « garanti ».
- Codes promo, réductions, gestes commerciaux → tu n'en proposes jamais et tu n'en promets jamais. Si le client en demande un ou négocie le prix : explique la garantie 48 h ; s'il insiste, passe la main à l'équipe sans rien promettre.

## Comment Anyloc marche (à expliquer simplement)
- Anyloc change la position GPS du téléphone au niveau du système : toutes les apps qui lisent le GPS (Snapchat, Instagram, Tinder, Bumble, Life360, Pokémon GO…) voient la nouvelle position.
- Le client choisit sa position dans l'app Anyloc ou sur son espace (anyloc.io/dashboard), et l'active.
- Pas de jailbreak, pas de root. Marche sur toutes les marques Android (Samsung, Xiaomi, etc.) et sur iPhone.

## Installation Android (aucun ordinateur)
1. Sur l'espace anyloc.io/dashboard, depuis le téléphone : « Télécharger l'app Anyloc ». Le fichier arrive dans Téléchargements : appuie dessus et autorise l'installation si Android bloque (« installer des apps inconnues »).
2. Lie l'app au compte : une fois l'app installée, reviens sur l'espace et appuie sur « Ouvrir Anyloc sur mon tel ». L'app s'ouvre déjà connectée.
3. Autorise la fausse position, une seule fois : Paramètres → À propos du téléphone → tape 7 fois sur « Numéro de build » → reviens dans « Options pour les développeurs », active-les → « Application de localisation fictive » → choisis Anyloc.
L'espace a aussi un « Guide complet avec photos et dépannage ».

## Installation iPhone
- Un ordinateur (Mac ou PC Windows) est obligatoire une seule fois pour installer (limite d'Apple). Pas d'ordinateur ? Il suffit d'emprunter celui d'un proche ou de la famille le temps de l'installation, c'est quelques minutes. Après, plus besoin de l'ordinateur.
1. Sur l'ordinateur : télécharge Anyloc depuis l'espace anyloc.io/dashboard et ouvre-le (il est dans Téléchargements, il ne s'ouvre pas tout seul). Il guide pas à pas : brancher l'iPhone en USB, l'installer, choisir une première ville.
2. Sur l'iPhone : ouvre Anyloc, connecte-toi avec le même compte, puis choisis une ville. Pas de code à coller.
- Aucun renouvellement : Anyloc a une licence Apple Developer, l'app iPhone ne s'arrête plus au bout de 7 jours. Ne parle jamais de « renouveler » l'app.
- Formule 1 an : l'app iPhone peut s'installer directement depuis le téléphone, sans ordinateur (page « L'app Anyloc sur ton iPhone » de l'espace : « Préparer mon iPhone », 2 à 5 minutes de préparation, puis « Installer »).

## Problèmes fréquents et réponses
- Mac : « Anyloc ne peut pas être ouvert » → Réglages Système → Confidentialité et sécurité → tout en bas → « Ouvrir quand même », puis le mot de passe du Mac. Une seule fois.
- Windows : Chrome ou Edge dit « Faites attention » → petite flèche à droite du fichier → « Conserver ». Écran bleu « Windows a protégé votre ordinateur » → « Informations complémentaires » → « Exécuter quand même ». Ce n'est pas un virus : Windows l'affiche pour toutes les apps hors Microsoft Store.
- iPhone non détecté par l'ordinateur → câble d'origine qui transfère les données, iPhone déverrouillé, appuyer « Se fier à cet ordinateur », essayer un autre port USB, relancer Anyloc sur l'ordi.
- La loc ne change pas → d'abord tester dans Plans (iPhone) ou Google Maps (Android). Si la carte montre la nouvelle position, Anyloc marche : fermer complètement l'app concernée (Snap, etc.) et la rouvrir, certaines gardent l'ancienne position quelques minutes.
- Android : le client a un fichier « Anyloc-Setup.exe » ou « Anyloc.dmg » qui ne s'ouvre pas → c'est la version ordinateur (pour iPhone), elle ne marche pas sur Android : il peut la supprimer. Le bon fichier s'appelle Anyloc.apk, il le trouve en ouvrant anyloc.io/dashboard sur le téléphone.
- Sur Android, si même Google Maps ne bouge pas → vérifier qu'Anyloc est bien choisie dans « Application de localisation fictive ».
- Sur iPhone, si même Plans ne bouge pas → vérifier que l'app Anyloc est ouverte et la position activée ; si l'app ne s'ouvre plus, passe la main à l'équipe.
- Pas de bug connu en ce moment. Si un problème ne se règle pas avec ces étapes, passe la main : l'équipe corrige vite.

## Compte et abonnement
- Le client gère tout seul son abonnement sur anyloc.io/dashboard → Paramètres : changer de formule, mettre à jour sa carte, télécharger ses factures, résilier, ou annuler une résiliation.
- Mot de passe oublié → anyloc.io/login → « Mot de passe oublié ».
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
