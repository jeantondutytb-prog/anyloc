# Anyloc iOS

App iPhone sideloadée qui lit la position depuis l'API Anyloc (`GET /api/device/location`).

## Statut

**v0.2** : UI SwiftUI + recherche de ville + sync API. Installation via Anyloc Setup (`Anyloc.ipa`).
Le spoofing GPS système reste à finaliser dans `LocationSpoofService.swift`.

## Prérequis

- macOS + Xcode 15+
- iPhone iOS 17+ en mode développeur
- Token appareil généré depuis le dashboard web
- [xcodegen](https://github.com/yonaskolb/XcodeGen) (optionnel) : `brew install xcodegen`

## Générer le projet Xcode

```bash
cd apps/ios
xcodegen generate
open Anyloc.xcodeproj
```

Sans xcodegen : crée un projet iOS App dans Xcode et ajoute les fichiers sous `Anyloc/`.

## Build IPA (pour Anyloc Setup)

### CI GitHub Actions (recommandé)

Ajoute ces secrets dans **GitHub → Settings → Secrets and variables → Actions** :

| Secret | Valeur |
|---|---|
| `APPLE_DEVELOPMENT_TEAM` | Ton Team ID (10 caractères, ex. depuis Xcode → Accounts) |
| `APPLE_ID` | Email de ton compte Apple |
| `APPLE_APP_SPECIFIC_PASSWORD` | Mot de passe app généré sur [appleid.apple.com](https://appleid.apple.com) |

Puis lance **Actions → Build iOS IPA** (ou push sur `apps/ios/`). L'IPA est publié sur GitHub Releases (`Anyloc.ipa`).

### Build local (Mac)

```bash
export APPLE_DEVELOPMENT_TEAM=XXXXXXXXXX
./scripts/build-ios-ipa.sh
gh release upload ios-v0.1.XXX apps/ios/dist/Anyloc.ipa --clobber
```

Anyloc Setup installera ce fichier via USB.

## Configuration dans l'app

- URL API : `https://anyloc.io` (ou ton URL locale)
- Token : `anyloc_...` depuis le dashboard

## Renouvellement (LocalDevVPN)

Sans compte Apple Developer payant, la signature gratuite dure ~7 jours.

1. À la première install USB, Anyloc bureau envoie le pairing au serveur.
2. Sur l'iPhone : **Profil → Renouveler** (ou bannière orange en haut).
3. Installe **LocalDevVPN** (App Store), connecte le Wi-Fi, appuie sur **Connect**.
4. Reviens dans Anyloc → **Renouveler**, puis relance l'app.

Si l'app ne s'ouvre plus : réinstalle une fois via Anyloc bureau (USB).
