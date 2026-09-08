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
npm run build:mac   # .dmg
npm run build:win   # .exe
```

Les artefacts buildés seront hébergés et référencés via `ANYLOC_DOWNLOAD_SETUP_MAC` et `ANYLOC_DOWNLOAD_SETUP_WIN` sur Vercel.

## Flow utilisateur

1. Télécharger Anyloc Setup depuis le dashboard
2. Se connecter avec son compte Anyloc (à venir)
3. Brancher l'iPhone en USB
4. Activer le mode développeur
5. Installer l'app Anyloc sur l'iPhone
