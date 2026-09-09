# Anyloc iOS

App iPhone sideloadée qui lit la position depuis l'API Anyloc et l'applique en GPS système.

## Statut

**v0.3** : UI SwiftUI + recherche de ville + sync API + **simulation GPS système** via les services développeur Apple (lib idevice + LocalDevVPN).

## Prérequis

- iPhone iOS 17+ en mode développeur
- [LocalDevVPN](https://apps.apple.com/app/localdevvpn/id6755608044) connecté avant d'ouvrir Anyloc
- Token appareil généré depuis le dashboard web
- Installation initiale via Anyloc Setup (Mac/PC + USB, une seule fois)

## Build

```bash
# 1. Génère IDevice.xcframework (macOS, ~5 min la première fois)
./scripts/build-idevice-xcframework.sh

# 2. Génère le projet Xcode
cd apps/ios
xcodegen generate

# 3. Archive / IPA (Team Apple requis)
export APPLE_DEVELOPMENT_TEAM=XXXXXXXXXX
../../scripts/build-ios-ipa.sh
```

## Configuration dans l'app

- URL API : `https://www.anyloc.io`
- Token : `anyloc_...` depuis le dashboard
- LocalDevVPN : **Connect** avant chaque utilisation

## Fonctionnement GPS

1. L'app poll `/api/device/location` toutes les 15 s (ou immédiatement quand tu choisis une ville).
2. `LocationSpoofService` ouvre un tunnel vers les services développeur locaux (via LocalDevVPN `10.7.0.1:49152`).
3. La position est appliquée **système-wide** — Snapchat, Insta, Maps, etc.

Le fichier `Documents/pairing.plist` est copié automatiquement par Anyloc Setup (macOS) lors de l'installation.

## Renouvellement (LocalDevVPN)

Comme Wiped/Locaflex : renouvelle la signature toutes les ~7 jours via LocalDevVPN — sans repasser par le Mac.
