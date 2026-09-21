# Redesign UI/UX — App iOS Anyloc

## Contexte

L'app iOS (`apps/ios/Anyloc`, SwiftUI, v0.2) est actuellement en dark mode
(fond `#0A0A0F`, accent rose plat `#EC4899`, cf. `Theme.swift`). La landing
page / checkout web (`src/app/globals.css`) utilise un thème clair
(`#fff9fb`) avec un dégradé de marque rose → violet (`#EC4899 → #A855F7`,
via `.gradient-text` / `.btn-gradient`).

Objectif : repenser l'UX de l'app (navigation, hiérarchie des écrans,
flow d'abonnement) et aligner son identité visuelle sur celle du site,
pour que l'app et le web se sentent comme le même produit.

## Écrans concernés

`apps/ios/Anyloc/`:
- `Theme.swift` — design tokens (couleurs)
- `MainTabView.swift` — navigation par onglets
- `DashboardView.swift` — écran principal (position / statut spoofing)
- `RenewalView.swift`, `SubscriptionExpiredView.swift`,
  `SubscriptionService.swift`, `SubscriptionModels.swift` — flow
  d'abonnement / renouvellement
- `LoginView.swift`, `FavoritesView.swift`, `SpotsView.swift`,
  `SettingsView.swift` — écrans secondaires (polish, pas de refonte
  structurelle)

Hors scope : logique métier (`AuthService.swift`, `LocationAPI.swift`,
`SignatureRenewalService.swift`) — ces fichiers ne sont pas touchés sauf
si un changement d'état UI l'exige strictement.

## 1. Design system (`Theme.swift`)

Nouveau thème clair, dérivé des tokens CSS du site
(`src/app/globals.css`) :

| Token | Valeur | Source |
|---|---|---|
| `bg` (fond principal) | `#FFF9FB` | `--background` |
| `bgSurface` (cartes/surfaces) | `#FFFFFF` | `--surface` |
| `bgSurfaceMuted` | `#FDF2F8` | `--surface-muted` |
| `border` | `#E4E4E7` | `--border` |
| `text` | `#18181B` | `--foreground` |
| `textMuted` | `#71717A` | `--muted` |
| `accentStart` | `#EC4899` | `--brand-hot` |
| `accentEnd` | `#A855F7` | `--brand-violet` |
| `success` | `#34D399` (inchangé) | — |
| `error` | `#F87171` (inchangé) | — |

`Theme.accent` devient un `LinearGradient` (rose → violet, diagonal
135°, comme `.btn-gradient` en CSS) exposé en plus d'une couleur pleine
(`Theme.accentSolid = #EC4899`) pour les cas où un gradient n'est pas
approprié (ex: texte de petite taille, icônes fines).

Tous les écrans consomment déjà `Theme.*` exclusivement (pas de couleurs
hardcodées trouvées dans les fichiers listés) — changer `Theme.swift`
propage le nouveau thème partout sans toucher aux autres fichiers pour
la partie couleur.

## 2. Navigation — `MainTabView.swift`

- Renommer/clarifier les 4 onglets avec libellé + SF Symbol explicite :
  Dashboard (`location.fill`), Spots (`mappin.and.ellipse`), Favoris
  (`star.fill`), Réglages (`gearshape.fill`).
- Tab bar en fond clair (`bgSurface`), icône/label actif en couleur
  `accentSolid` (un gradient sur une tab bar standard SwiftUI n'est pas
  supporté nativement — on garde le plein rose de marque ici).

## 3. Dashboard — `DashboardView.swift`

Restructuration par hiérarchie d'information, du plus important au
moins important :

1. **Carte de statut principale** (pleine largeur, en haut) : ville /
   position actuelle en gros, badge "Actif" / "Inactif" du spoofing
   (couleur `success`/`textMuted`), fond avec léger dégradé de marque en
   arrière-plan (subtil, pas plein).
2. **Actions rapides** : changer de position, accéder aux favoris —
   boutons secondaires sous la carte de statut.
3. Le reste du contenu existant (historique, détails) suit en dessous,
   sans changement de fonctionnalité, juste de style.

Pas de nouvel état ni nouvelle donnée métier : uniquement réorganisation
visuelle du contenu déjà affiché par `DashboardView` aujourd'hui.

## 4. Flow abonnement — `RenewalView.swift` / `SubscriptionExpiredView.swift`

- Un seul écran à la fois visible pour l'état courant de l'abonnement
  (pas de superposition d'états) : statut abonnement → message clair →
  un CTA principal unique, bouton en dégradé de marque
  (`accentStart → accentEnd`), cohérent avec le bouton de checkout web
  (`.btn-gradient`).
- Simplification du parcours de renouvellement pour qu'il n'y ait
  qu'une seule action évidente par écran (pas de choix multiples
  concurrents).
- Pas de changement de la logique d'expiration/renouvellement
  (`SubscriptionService.swift`) — uniquement présentation.

## 5. Écrans secondaires — Login / Favoris / Spots / Réglages

Polish visuel avec les nouveaux tokens (cartes, boutons, champs de
recherche/formulaire) en réutilisant les mêmes composants que le
Dashboard et le flow d'abonnement pour rester cohérent. Pas de
changement de structure ou de fonctionnalité sur ces écrans.

## Composants partagés à introduire

Pour éviter de dupliquer le style carte/bouton dans chaque écran :
- `Theme.swift` : gradient de marque réutilisable.
- Un style de carte commun (fond `bgSurface`, coin arrondi, ombre légère)
  et un style de bouton primaire (gradient + texte blanc) à factoriser
  si le même pattern apparaît dans au moins 2 écrans — sans sur-designer
  en amont : on factorise au fil de l'implémentation dès qu'un doublon
  apparaît réellement.

## Test / vérification

- Build + run dans le simulateur iOS (`mcp__Claude_Code_iOS_Simulator__control`)
  pour chaque écran modifié : Login, Dashboard, Spots, Favoris,
  Réglages, Renewal, SubscriptionExpired.
- Vérification visuelle par capture d'écran à chaque étape (contraste
  texte/fond, lisibilité du dégradé, état actif de la tab bar).
- Pas de tests unitaires SwiftUI existants dans le projet à ce jour —
  la vérification reste visuelle/manuelle via simulateur.

## Hors scope

- Logique métier (auth, API de localisation, calcul de signature de
  renouvellement).
- Android (`apps/android`) — non concerné par cette spec.
- Ajout de nouvelles fonctionnalités produit (ex: nouveaux écrans,
  nouvelles données) — uniquement redesign de l'existant.
