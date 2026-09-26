# Anyloc Setup (Desktop Mac)

App Mac qui fait le lien entre l'iPhone et le GPS. L'utilisateur branche son iPhone, Anyloc Setup applique le spoof GPS via `pymobiledevice3`. La telecommande iPhone est une web app (`anyloc.io/app`, ajoutee a l'ecran d'accueil) : l'utilisateur choisit sa position depuis l'iPhone, le Mac l'applique. Aucune app n'est installee sur l'iPhone (une IPA signee en developpement ne s'installe que sur les appareils de son profil de provisionnement).

## Statut

**v0.3** : auth Supabase, auto-sync position, GPS persistant (re-apply toutes les 5s), auto-launch au demarrage Mac, mode tray, activation du mode developpeur via USB (`amfi reveal-developer-mode`), interface identique a l'app iPhone (3 onglets : Carte, Decouvrir, Profil).

## Prerequis

- macOS Ventura ou plus recent
- `pymobiledevice3` : `pip3 install pymobiledevice3`

## Developpement

```bash
cd apps/setup
npm install
npm run dev
```

## Build

```bash
npm run build:mac   # dist/Anyloc.dmg
```

Pour un DMG signe et notarise (sans alerte Gatekeeper), la CI a besoin des secrets
`MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_IDENTITY`, `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD` et `APPLE_TEAM_ID` (certificat Developer ID, programme Apple Developer payant).

## Flow utilisateur

1. Telecharger Anyloc Setup depuis anyloc.io
2. Ouvrir l'app, se connecter avec son compte Anyloc
3. Brancher l'iPhone en USB, faire confiance
4. Activer le mode developpeur (l'app fait apparaitre l'option, puis detecte l'activation)
5. Sur l'iPhone : scanner le QR code → anyloc.io/app dans Safari → Partager → Sur l'ecran d'accueil
6. Choisir un lieu — la position GPS change instantanement

L'app Mac reste dans la barre de menus et se relance au demarrage. L'iPhone reste branche et sert de telecommande.
