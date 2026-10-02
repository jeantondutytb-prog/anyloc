# Anyloc Setup (Desktop Mac)

App Mac qui fait le lien entre l'iPhone et le GPS. L'utilisateur branche son iPhone, Anyloc Setup applique le spoof GPS via `pymobiledevice3`. La telecommande iPhone est une web app (`anyloc.io/app`, ajoutee a l'ecran d'accueil) : l'utilisateur choisit sa position depuis l'iPhone, le Mac l'applique. Aucune app n'est installee sur l'iPhone (une IPA signee en developpement ne s'installe que sur les appareils de son profil de provisionnement).

## Statut

**v0.4** : interface sombre façon carte plein écran (rail à gauche, panneau de contrôle à droite) avec trois modes :

- **Téléporter** : la position est écrite dans Supabase, l'auto-sync l'applique via USB (comme depuis l'iPhone).
- **Marche** : joystick ou clavier (ZQSD / WASD / flèches), la position est poussée directement en USB (`simulate-location set`, au plus toutes les 2 s). L'auto-sync est suspendu pendant la marche.
- **Trajet** : recherche (itinéraire routier via routing.openstreetmap.de), dessin point par point ou import GPX. Le trajet est converti en GPX horodaté et rejoué par `simulate-location play`.

Plus : favoris (lieux + trajets, avec emoji), spots « Découvrir », maison, auth Supabase, auto-launch, mode tray, activation du mode développeur via USB.

## Prerequis

- macOS Ventura ou plus recent (puce Apple ou Intel), ou Windows 10+
- Rien d'autre : Python et `pymobiledevice3` sont embarques dans l'installeur

## Developpement

```bash
cd apps/setup
npm install
npm run dev
npm run preview:app   # écran principal avec données factices, sans iPhone
```

## Build

```bash
node build-tools/bundle-python.mjs arm64   # python-dist/arm64 (x64 pour Intel / Windows)
npm run build:mac -- --arm64               # dist/Anyloc.dmg
```

`bundle-python.mjs` telecharge un CPython relocalisable (python-build-standalone,
version et SHA-256 figes), y installe `pymobiledevice3` avec les versions de
`build-tools/python-constraints.txt`, et l'app l'utilise via `python -m pymobiledevice3`.

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
