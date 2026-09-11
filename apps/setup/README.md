# Anyloc Setup (Desktop Mac)

App Mac qui fait le lien entre l'iPhone et le GPS. L'utilisateur branche son iPhone, Anyloc Setup applique le spoof GPS via `pymobiledevice3`. L'app iPhone sert de télécommande : l'utilisateur choisit sa position depuis l'iPhone, le Mac l'applique.

## Statut

**v0.3** : auth Supabase, auto-sync position, GPS persistant (re-apply toutes les 5s), auto-launch au démarrage Mac, mode tray, installation app iOS via USB, interface identique à l'app iPhone (3 onglets : Carte, Découvrir, Profil).

## Prérequis

- macOS Ventura ou plus récent
- `pymobiledevice3` : `pip3 install pymobiledevice3`

## Développement

```bash
cd apps/setup
npm install
npm run dev
```

## Build

```bash
npm run build:mac   # dist/Anyloc-Setup.dmg
```

## Flow utilisateur

1. Télécharger Anyloc Setup depuis anyloc.io
2. Ouvrir l'app, se connecter avec son compte Anyloc
3. Brancher l'iPhone en USB, activer le mode développeur
4. Cliquer "Installer l'app iPhone"
5. Ouvrir l'app Anyloc sur iPhone, se connecter
6. Choisir un lieu — la position GPS change instantanément

L'app Mac reste dans la barre de menus et se relance au démarrage. L'iPhone reste branché et sert de télécommande.
