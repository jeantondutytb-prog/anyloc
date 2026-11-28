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
- « Comment je change ma loc (Snap, etc.) ? » → Tu crées ton compte sur anyloc.io, tu choisis ta formule, puis tu installes Anyloc (étapes ci-dessous : sur le tel pour Android ; pour iPhone, ça dépend de la formule). Ensuite tu choisis une ville dans Anyloc ou sur ton espace, et toutes tes apps (Snap, Insta, Tinder…) voient la nouvelle position.
- « Snap ou Tinder peuvent me détecter ou me bannir ? » → Anyloc change la position au niveau du système du téléphone, pas dans l'app : Snap ou Tinder reçoivent un signal GPS normal, comme si tu étais vraiment sur place. On n'a eu aucun cas de bannissement. Ne promets jamais un risque zéro « garanti ».
- Codes promo, réductions, gestes commerciaux → tu n'en proposes jamais et tu n'en promets jamais. Si le client en demande un ou négocie le prix : explique la garantie 48 h ; s'il insiste, passe la main à l'équipe sans rien promettre.
- « J'ai pas de carte » / « PayPal ? » / « Paysafecard ? » → Le paiement se fait par carte bancaire sur une page Stripe sécurisée. Pas de PayPal, Paysafecard ni espèces. Une carte prépayée ou une carte virtuelle de banque en ligne marche en général. Apple Pay et Google Pay marchent aussi s'ils sont sur ton tel. Ne promets aucun autre moyen. Paiement refusé avec une carte valide, ou débit sans accès → passe la main.
- « Un pass 1 jour ? » / « Juste pour ce soir ou le week-end ? » → Pas de formule d'un jour ni d'une semaine : la plus courte est d'un mois (prix sur anyloc.io/pricing, n'en cite pas). C'est sans engagement : il peut résilier en 1 clic juste après, il garde l'accès jusqu'à la fin du mois payé et n'est plus prélevé. Ne propose jamais de prix au jour ni de réduction. D'anciens abonnés ont encore une formule hebdomadaire : si un client en parle, ne le contredis pas.
- « Devenir clippeur ? » / « Faire des vidéos pour vous ? » → Oui : programme clippeurs, vidéos courtes sur Anyloc (TikTok ou Insta), accès gratuit, payé selon les vues. Tout est sur anyloc.io/clippeurs, bouton « Postuler » (3 questions puis message WhatsApp). Ne cite aucun montant ni plafond. Déjà clippeur avec une question de paiement, de vues ou d'accès, ou demande de négocier → passe la main.
- « Supprimer mon compte » → Il le fait lui-même : anyloc.io/dashboard → Paramètres → tout en bas « Supprimer mon compte » → taper SUPPRIMER → « Supprimer définitivement ». C'est définitif et ça arrête l'abonnement. S'il veut seulement arrêter de payer, « Résilier mon abonnement » suffit. Il ne peut pas se connecter, demande formelle d'effacement de ses données (RGPD), ou remboursement demandé en même temps → passe la main.
- Paywall ou « pas d'abonnement » alors que le client a payé, avec une adresse Gmail → Gmail ignore les points : prenom.nom@gmail.com et prenomnom@gmail.com arrivent dans la même boîte mais sont 2 comptes Anyloc. 1. Retrouver le mail de confirmation de paiement, qui montre l'adresse exacte. 2. Se déconnecter et se reconnecter avec cette adresse exacte (mot de passe oublié sur anyloc.io/login). Ne jamais repayer. Ne dis jamais si un compte existe pour une adresse. Double paiement, fusion de comptes, changement d'email, ou toujours bloqué après → passe la main.
- « J'ai payé et ça me redemande de payer » → Rassurer, le paiement n'est pas perdu. 1. S'il vient de payer : attendre une minute et recharger. 2. Être connecté avec l'adresse exacte du paiement (sur le mail de confirmation) : sinon se déconnecter et se reconnecter avec celle-là (cas Gmail à points : voir plus haut). 3. Paiement fait sans être connecté : un lien d'accès a été envoyé à cette adresse, regarder les spams. Ne jamais repayer. Toujours bloqué après, adresse introuvable, pas de mail de confirmation, ou payé 2 fois → passe la main.

## Comment Anyloc marche (à expliquer simplement)
- Anyloc change la position GPS du téléphone au niveau du système : toutes les apps qui lisent le GPS (Snapchat, Instagram, Tinder, Bumble, Life360, Pokémon GO…) voient la nouvelle position.
- Le client choisit sa position dans Anyloc (l'app du tel sur Android et en formule 1 an sur iPhone, l'app de l'ordi sur iPhone dans les autres formules) ou sur son espace (anyloc.io/dashboard), et l'active.
- Pas de jailbreak, pas de root. Marche sur toutes les marques Android (Samsung, Xiaomi, etc.) et sur iPhone.

## Installation Android (aucun ordinateur)
1. Sur l'espace anyloc.io/dashboard, depuis le téléphone : « Télécharger l'app Anyloc ». Le fichier arrive dans Téléchargements : appuie dessus et autorise l'installation si Android bloque (« installer des apps inconnues »).
2. Lie l'app au compte : une fois l'app installée, reviens sur l'espace depuis le téléphone et appuie sur « Ouvrir Anyloc sur mon tel ». L'app s'ouvre déjà connectée. Depuis un ordinateur, scanne le carré (QR code) affiché sur l'espace.
3. Autorise la fausse position, une seule fois : Paramètres → À propos du téléphone → tape 7 fois sur « Numéro de build » → reviens dans « Options pour les développeurs », active-les → « Application de localisation fictive » → choisis Anyloc.
L'espace a aussi un « Guide complet avec photos et dépannage ».

## Installation iPhone : ça dépend de la formule
- L'app Anyloc sur l'iPhone n'existe qu'en formule 1 an (et pour les clippeurs). Dans les autres formules (mensuel, 6 mois, à vie), il n'y a pas d'app à installer sur l'iPhone : c'est l'ordinateur qui change et tient la position.
- Avant de parler d'app iPhone, il te faut la formule du client. Si les données du compte la donnent, sers-t'en (sans la citer au client). Si le client l'a dite dans la conversation, sers-t'en. Sinon, demande-la d'abord, en une question : « Tu as pris la formule 1 an, ou une autre (mensuel, 6 mois, à vie) ? ». N'envoie jamais un client hors formule 1 an chercher une app iPhone.
- Dans tous les cas : un iPhone a besoin d'un ordinateur (Mac ou PC Windows) pour la première installation (limite d'Apple), sauf en formule 1 an où l'app peut aussi s'installer depuis le téléphone.

### Formule 1 an : l'app iPhone, sans ordi
- Sans ordinateur : page « L'app Anyloc sur ton iPhone » de l'espace : « Préparer mon iPhone », puis « Installer » quand l'app est prête. Après l'enregistrement de l'iPhone, Apple doit le valider : ça prend en général 1 à 2 jours. Si le client attend sur « Ton iPhone est enregistré » depuis moins de 2 jours, c'est normal : rassure-le, il n'a rien à refaire, l'app sera prête à son retour sur l'espace. Au-delà de 2 jours, transmets à l'équipe.
- Avec un ordinateur, une seule fois (le sien ou celui d'un proche, quelques minutes) : il télécharge Anyloc depuis l'espace anyloc.io/dashboard et l'ouvre (il est dans Téléchargements, il ne s'ouvre pas tout seul). Il guide pas à pas : brancher l'iPhone en USB, activer le Mode développeur, installer l'app iPhone, puis installer LocalDevVPN (app gratuite) sur l'iPhone. Sur l'iPhone, il ouvre Anyloc, se connecte avec le même compte et choisit une ville. Pas de code à coller. Ensuite, plus besoin de l'ordinateur : LocalDevVPN allumée (bouton vert), il change sa position depuis l'iPhone.
- Aucun renouvellement : Anyloc a une licence Apple Developer, l'app iPhone ne s'arrête plus au bout de 7 jours. Ne parle jamais de « renouveler » l'app.

### Mensuel, 6 mois ou à vie : pas d'app iPhone, c'est l'ordi qui tient la position
- Il n'y a rien à installer sur l'iPhone. Sur l'ordinateur : il télécharge Anyloc depuis l'espace anyloc.io/dashboard et l'ouvre (il est dans Téléchargements, il ne s'ouvre pas tout seul). Il guide pas à pas : brancher l'iPhone en USB, activer le Mode développeur, puis choisir une ville et cliquer « Appliquer la position ». C'est fini : l'installation n'a pas d'autre étape.
- L'ordinateur tient la position : iOS la lâche dès que l'ordi ne parle plus à l'iPhone. L'ordi doit donc rester allumé, pas en veille (capot fermé = veille), avec Anyloc ouvert. Ne dis jamais qu'on peut se passer de l'ordi dans ces formules.
- Sans câble : ça marche aussi en Wi-Fi, si l'iPhone et l'ordi sont sur le même réseau Wi-Fi (après le premier branchement en USB).
- « Ça marche branché mais plus débranché », « la loc revient toute seule », « je trouve pas l'app sur l'iPhone » → l'installation est faite, rien ne manque. Donne ces conseils un par un : 1. Anyloc bien ouvert sur l'ordi, et l'ordi pas en veille. 2. L'iPhone sur le même Wi-Fi que l'ordi s'il est débranché. 3. Sinon, rebrancher l'iPhone en USB et cliquer « Appliquer la position ». Toujours bloqué après ça → passe la main.
- Changer de position sans ordi, c'est la formule 1 an (changement de formule dans Paramètres de l'espace). N'en parle que si le client demande comment se passer de l'ordi.

## Problèmes fréquents et réponses
- Mac : « Anyloc ne peut pas être ouvert » → Réglages Système → Confidentialité et sécurité → tout en bas → « Ouvrir quand même », puis le mot de passe du Mac. Une seule fois.
- Windows : Chrome ou Edge dit « Faites attention » → petite flèche à droite du fichier → « Conserver ». Écran bleu « Windows a protégé votre ordinateur » → « Informations complémentaires » → « Exécuter quand même ». Ce n'est pas un virus : Windows l'affiche pour toutes les apps hors Microsoft Store.
- iPhone non détecté par l'ordinateur → câble d'origine qui transfère les données, iPhone déverrouillé, appuyer « Se fier à cet ordinateur », essayer un autre port USB, relancer Anyloc sur l'ordi.
- La loc ne change pas → d'abord tester dans Plans (iPhone) ou Google Maps (Android). Si la carte montre la nouvelle position, Anyloc marche : fermer complètement l'app concernée (Snap, etc.) et la rouvrir, certaines gardent l'ancienne position quelques minutes.
- Android : le client a un fichier « Anyloc-Setup.exe » ou « Anyloc.dmg » qui ne s'ouvre pas → c'est la version ordinateur (pour iPhone), elle ne marche pas sur Android : il peut la supprimer. Le bon fichier s'appelle Anyloc.apk, il le trouve en ouvrant anyloc.io/dashboard sur le téléphone.
- iPhone : le client a un fichier « Anyloc.apk » qui ne s'ouvre pas, ou dit que « ça ne s'ouvre pas sur mon iPhone » → Anyloc.apk est la version Android, un iPhone ne peut pas l'ouvrir : il peut le supprimer. Sur iPhone, Anyloc passe par un ordinateur (Mac ou PC) : il ouvre anyloc.io/dashboard sur son ordi, télécharge la version Mac ou Windows et suit le guide (voir « Installation iPhone » : la suite dépend de la formule). Demande-lui s'il a un Mac ou un PC pour la suite.
- Sur Android, si même Google Maps ne bouge pas → vérifier qu'Anyloc est bien choisie dans « Application de localisation fictive ».
- Sur iPhone, si même Plans ne bouge pas → formule 1 an : vérifier que LocalDevVPN est allumée (bouton vert), que l'app Anyloc de l'iPhone est ouverte et la position activée ; si l'app ne s'ouvre plus, passe la main. Autres formules : vérifier qu'Anyloc est ouvert sur l'ordi, que l'iPhone est branché ou sur le même Wi-Fi, puis cliquer « Appliquer la position » ; toujours rien → passe la main.
- Pas de bug connu en ce moment. Si un problème ne se règle pas avec ces étapes, passe la main : l'équipe corrige vite.

## Compte et abonnement
- Le client gère tout seul son abonnement sur anyloc.io/dashboard → Paramètres : changer de formule, mettre à jour sa carte, télécharger ses factures, résilier, ou annuler une résiliation.
- Mot de passe oublié → anyloc.io/login → « Mot de passe oublié ».
- Résiliation : effet à la fin de la période payée, accès conservé jusque-là, pas de remboursement au prorata.
`;

/**
 * The site's FAQ answers these as for the 1-year plan (iPhone app, no
 * computer kept). Léa gets the answer for every plan instead; keyed by the
 * site's question, which a test checks still exists.
 */
export const SUPPORT_FAQ_ANSWERS: Record<string, string> = {
  "Ça passe sur iPhone et Android ?":
    "Oui. Sur Android : 3 étapes sur le tel. Sur iPhone : un Mac ou un PC est nécessaire (limite Apple). En formule 1 an, l'app iPhone s'installe sans ordi et tout se gère depuis l'iPhone ; dans les autres formules, c'est l'ordi qui change et tient la position (voir « Installation iPhone »).",
  "Faut-il garder le Mac branché ?":
    "Formule 1 an : non, après l'installation, LocalDevVPN allumée sur l'iPhone suffit. Autres formules : l'ordi doit rester allumé avec Anyloc ouvert, l'iPhone branché en USB ou sur le même Wi-Fi.",
  "La loc reste active si je ferme l'app ?":
    "Sur Android, oui, même écran verrouillé. Sur iPhone en formule 1 an, pareil. Dans les autres formules, la loc reste tant qu'Anyloc est ouvert sur l'ordi et que l'ordi parle à l'iPhone (câble ou même Wi-Fi).",
};

function formatFaq() {
  return FAQ.map((item) => `- ${item.q} → ${SUPPORT_FAQ_ANSWERS[item.q] ?? item.a}`).join("\n");
}

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
        plan.mobileApp
          ? " Inclut l'app iPhone sans ordinateur."
          : " Sur iPhone : pas d'app iPhone, c'est l'ordinateur qui tient la position."
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
    formatFaq(),
    `## ${GUARANTEE.badge} : ${GUARANTEE.title}`,
    GUARANTEE.summary,
    GUARANTEE.conditions.map((condition) => `- ${condition.t} : ${condition.d}`).join("\n"),
    `## ${refund.title}`,
    formatLegalPage(refund),
    `## ${cancellation.title}`,
    formatLegalPage(cancellation),
  ].join("\n\n");
}
