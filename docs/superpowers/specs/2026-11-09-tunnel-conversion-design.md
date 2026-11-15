# Tunnel de conversion : design

Date : 2026-11-09. Statut : brouillon à valider.

## Pourquoi

Du 10 octobre au 9 novembre, 8 922 personnes ont démarré l'onboarding et 79 ont acheté, pour 1 486 € de CA. Le but est de vendre plus au même trafic, en gagnant à chaque étape plutôt qu'en cherchant un seul coup de levier. Inspiration : une analyse vidéo d'un SaaS (questions marketing, frictions séparées, annuel poussé, add-on, offre de sortie). Ses chiffres (+25 %, x2) ne sont pas prouvés : on mesure les nôtres.

| Constat (30 jours) | Chiffre |
|---|---|
| Perte à l'inscription | 8 521 → 3 404 (60 %) |
| Temps médian entre inscription et checkout | 1 seconde |
| Du checkout vu à l'achat | 3 401 → 79 (environ 2,3 %) |
| Part de l'annuel | 15 % des ventes, 46 % du CA |
| Raison de départ citée | Prix : 64 réponses sur 76 (131 sans réponse) |
| Downsell mensuel accepté | 20 sur 420 (clics) |
| Mensuels au 1er renouvellement (33 clients, 24 sept. au 9 oct.) | environ 1/3 renouvelle, 1/3 annule, 1/3 paiement échoué |

Valeur estimée d'un client mensuel : 13 à 15 €. C'est une estimation sur un petit échantillon.

## Objectifs

1. Séparer l'inscription du paiement par une série de questions qui personnalise réellement la suite.
2. Faire de l'annuel le choix par défaut, et rattraper ceux qui partent avec une offre annuelle.
3. Ajouter un add-on au paiement.
4. Récupérer une partie des renouvellements échoués.

## Hors périmètre

- L'acquisition (TikTok, clippeurs).
- La grille de prix v2 (19 / 29 / 79 €) : aucune exposition au test depuis le 27 octobre. On construit pour la grille actuelle (9,90 / 34,90 / 49 €). *Mon choix.* L'offre de sortie est définie par plan, donc ajouter la v2 plus tard ne demandera qu'une ligne de config.
- Le parcours `/app` (téléportation avant paiement) : son test s'est arrêté le 3 novembre, on n'y touche pas.
- Le paywall de l'app iOS native.
- Une nouvelle formule d'abonnement.

## Ce qu'on refuse de faire

Même si ça convertirait mieux :

- **Stats inventées.** Aucun « 93 % des gens comme toi ». Les écrans intermédiaires n'utilisent que des faits vrais : garantie 48 h, installation en 5 minutes, comparaison avec un VPN (`COMPARISON` dans `constants.ts`), ou des chiffres calculés sur la vraie base.
- **Faux compte à rebours.** Une offre a une vraie fin, vérifiée côté serveur.
- **Add-on pré-coché.** Le droit européen interdit de pré-cocher un paiement supplémentaire.
- **Prix de référence gonflé.** Une réduction se calcule sur un prix réellement pratiqué.
- **Questions décoratives.** Chaque réponse change quelque chose de visible ensuite, comme le fait déjà le quiz actuel.
- **Harcèlement au départ.** Un seul retour-arrière intercepté par visite, et au plus deux écrans d'offre à la suite.
- **« Où nous as-tu connus ? » avant le paiement.** Cette question n'a sa place qu'après l'achat.

## Contraintes qui ont façonné le design

**Les add-ons natifs de Stripe sont exclus.** La doc Stripe indique que les `optional_items` ne sont pas pris en charge avec le formulaire intégré, or le paiement principal utilise ce formulaire (`ui_mode: "embedded_page"`). L'add-on se construit donc dans notre interface, et s'ajoute comme deuxième ligne de la session Stripe.

**Le volume limite les tests A/B.** Avec environ 1 700 personnes par groupe et par mois au checkout (base 2,3 %) :

| Effet à détecter sur l'achat | Personnes par groupe | Durée |
|---|---|---|
| +30 % | environ 8 300 | environ 5 mois |
| x2 | environ 1 000 | environ 18 jours |

Conséquences : un seul test à la fois par endroit du tunnel, on lit aussi un indicateur intermédiaire plus fréquent, et un résultat « pas de différence » sur l'achat ne prouve rien pour un petit effet. Lancer les lots l'un après l'autre évite aussi de mélanger leurs effets.

## Lot 1 : séparer les frictions

Parcours visé (variante `questions`) : landing → onboarding actuel (destination, aperçu) → inscription → questions et écrans intermédiaires → récap personnalisé → paywall.

- Réutiliser `/onboarding/quiz` et `OnboardingQuizView`. La destination choisie avant l'inscription doit être reprise, pas redemandée. Elle doit survivre à la connexion Google.
- 9 à 10 questions au total : les 6 existantes (`QUIZ_QUESTIONS`) et 3 ou 4 nouvelles, chacune utile :
  - À quelle fréquence tu t'en servirais ? → justifie l'annuel sur le récap.
  - Tu en as besoin pour quand ? → adapte le message sur la rapidité d'installation.
  - Tu as déjà essayé autre chose (VPN, Fake GPS, rien) ? → écran de comparaison ciblé.
  - Le texte final et une éventuelle 4e question sont laissés au constructeur, avec les règles ci-dessus.
- 2 écrans intermédiaires de faits vrais, placés vers le tiers et les deux tiers du parcours.
- Barre de progression et possibilité de revenir en arrière.
- `getQuizRecommendation` recommande l'annuel à tout le monde dans cette variante, l'app mobile restant mise en avant pour l'iPhone.
- Le tirage réutilise `onboarding-experiment.ts` : variantes `control` et `questions`, 50/50, à la place de `app`.
- Mesures : achats par inscrit (principal) ; clic sur « Continuer » au paywall (base 19,6 %, indicateur plus rapide) ; abandon par question.

## Lot 2 : annuel et offre de sortie

**Paywall.** Mise à jour du 10/11 : sur `main`, le mensuel est de nouveau présélectionné et le prix reste affiché par jour, deux choix de Jean après la baisse des ventes du 26/10. On ne les change pas ici. L'annuel garde son badge « -59 % », et l'offre de sortie fait le travail de pousser l'annuel. La variante `questions` du lot 1 recommande l'annuel, et le test le mesure.

**Déclencheurs de l'offre :**

- fermeture de la fenêtre de paiement (`closePaymentModal`) ;
- bouton retour du paywall (`onBack`) ;
- retour arrière du navigateur sur le paywall, intercepté une seule fois.

Beaucoup de gens quittent sans jamais ouvrir le paiement : seule la première condition ne suffirait pas. La fermeture d'onglet n'est pas interceptable de façon fiable, les e-mails de relance existants la couvrent.

**Offre :** l'annuel à 29 € au lieu de 49 € (-41 %), quel que soit le plan regardé. Le prix est bloqué à vie : 29 € chaque année tant que l'abonnement continue, et le texte de l'offre le dit. *Décision de Jean.*

**Règles, vérifiées côté serveur :**

- personne connectée, sans abonnement passé ;
- une seule offre par compte, ouverte 2 heures à partir du premier affichage (comme `FIRST_MONTH_OFFER_WINDOW_MS`) ;
- nouvelle colonne sur `profiles` pour l'heure de début, et route qui la pose ;
- `/api/stripe/embedded-checkout` et `/api/checkout` n'appliquent le coupon qu'après cette vérification, jamais sur la seule foi du navigateur.

**Stripe :** un coupon de 20 € limité au produit annuel, avec `duration: "forever"`, identifiant en variable d'environnement. Un changement de formule depuis le portail fait perdre ce tarif : à vérifier et à annoncer dans la page d'offre.

**Test :** 50/50 tiré à la première sortie, comme `getOrPickCloseOfferVariant`. Mesures : CA par personne exposée sur 30 jours (principal) ; taux d'acceptation ; achats payés et pas seulement clics.

**Après un refus :** un deuxième et dernier écran propose le mensuel à 9,90 € sans réduction (`CheckoutDownsellSheet`). Dans ce parcours, le -50 % à la fermeture et le test clippeurs sont retirés. *Décision de Jean.* Le -50 % sur carte refusée faute de solde ne change pas.

## Lot 3 : add-on au paiement

- Case **non cochée** sur le paywall, au-dessus de « Continuer », avec le nom, le bénéfice et le prix.
- Paiement unique, ajouté comme deuxième ligne de la session Stripe. Il ne se répète donc pas au renouvellement.
- `requestCheckoutSession` et les deux routes reçoivent les add-ons, validés contre une liste côté serveur. La fenêtre de paiement affiche le total.
- Le coupon du lot 2 ne porte jamais sur l'add-on. *Mon choix :* pas d'add-on sur les paiements déjà réduits, pour garder ces offres simples.
- Identifiant de l'add-on dans les metadata Stripe et dans `purchase_completed`. *Mon choix :* la garantie 48 h couvre aussi l'add-on.
- Mesures : part des paiements avec add-on, et clic sur « Continuer » pour vérifier que la case ne fait pas baisser les ventes.

**Add-on retenu : le Pack Voyageur** (*décision de Jean*), à 14,90 € en paiement unique (*prix : mon choix, à ajuster*).

- Le droit au pack est enregistré côté serveur au paiement (`checkout.session.completed`, via l'identifiant dans les metadata), et retiré en cas de remboursement. Les trois clients (web, desktop, iPhone) lisent ce droit.
- Tant que le pack n'est pas livrable, la case n'apparaît pas. À son lancement, l'option « En voiture, train ou avion » du quiz cesse d'être « bientôt dispo » et renvoie vers le pack.

- Les trajets de base (tracer un parcours, régler la vitesse, faire des pauses) sont annoncés dans toutes les formules et déjà vendus : ils restent inclus, pour les clients actuels comme pour les nouveaux.
- Le pack ajoute ce que le quiz annonce comme « bientôt dispo » : voiture, train et avion, avec des vitesses réalistes et des départs cohérents (gare, aéroport).
- Ces modes n'existent pas encore (la simulation ne connaît qu'une vitesse). Ils doivent fonctionner sur le web, l'app desktop et l'iPhone **avant** la mise en vente, ce qui fait du lot 3 le plus gros lot.
- Un texte « Pack Voyageur » existe déjà dans `checkout-locaflex-copy.ts`. Ne pas reprendre « La plupart l'ajoutent » tant que ce n'est pas vrai.
## Lot 4 : renouvellements échoués

Stripe relance déjà les paiements (Smart Retries), et un parcours `past_due_card` existe. On ajoute :

1. La vérification que les relances et e-mails de Stripe sont bien activés (réglage du tableau de bord).
2. Une bannière dans le dashboard et le remote pour les comptes `past_due`, menant à la mise à jour de la carte.
3. Un e-mail le lendemain de l'échec, avec le même lien.

Mesure : part des comptes `past_due` redevenus actifs sous 14 jours. Ce lot n'a pas besoin de test A/B.

## Ordre et décisions d'arrêt

Lots 1, 2, 3 l'un après l'autre. Le lot 4 est indépendant et peut avancer en parallèle.

Avant le lot 1, vérifier dans Vercel l'état réel des variables `NEXT_PUBLIC_PRICING_EXPERIMENT` et `NEXT_PUBLIC_ONBOARDING_EXPERIMENT`, et que la production correspond au code. Le test de grille et le test de fermeture n'ont plus d'exposition depuis le 27 octobre, sans explication dans le code.

Chaque lot passe derrière une variable d'environnement, et se désactive sans déploiement de code. On garde une variante après au moins 1 000 personnes par groupe, si l'indicateur principal n'est pas en baisse.

## Laissé au constructeur

Découpage des composants, textes exacts dans le ton existant (tutoiement, phrases courtes), emplacement du code de bannière, forme de la migration, et noms des événements nouveaux, tant qu'ils suivent les conventions existantes.

Rappels pour le code : lire les guides de `node_modules/next/dist/docs/` avant d'écrire du Next (`AGENTS.md`). La branche actuelle contient beaucoup de changements non commités sans rapport, donc travailler sur une branche propre depuis `main`. La création des objets Stripe en production demande l'accès au compte Stripe de Jean.
