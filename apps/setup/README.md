# Anyloc Setup (Desktop)

Logiciel desktop Mac/Windows pour la mise en route iPhone : branchement USB, mode développeur, installation de l'app iOS sideloadée.

## Statut

**v0.2** : détection USB réelle via `pymobiledevice3` ou `idevice_id`. Bouton d'installation branché (IPA à placer dans `apps/ios/dist/Anyloc.ipa`).

## Prérequis USB (Mac)

```bash
pip install -r apps/setup/scripts/requirements.txt
```

## Développement

```bash
cd apps/setup
npm install
npm run dev
```

## Build

```bash
# Depuis la racine du repo
./scripts/build-setup.sh

# Ou ici directement
npm run build:mac   # dist/Anyloc-Setup.dmg
npm run build:win   # dist/Anyloc-Setup.exe
```

CI : GitHub Actions **Build Anyloc Setup** publie les binaires en release GitHub.
Configure ensuite `ANYLOC_DOWNLOAD_SETUP_MAC` et `ANYLOC_DOWNLOAD_SETUP_WIN` sur Vercel avec les URLs de la release.

## Flow utilisateur

1. Télécharger Anyloc Setup depuis le dashboard
2. Se connecter avec son compte Anyloc (à venir)
3. Brancher l'iPhone en USB
4. Activer le mode développeur
5. Installer l'app Anyloc sur l'iPhone
