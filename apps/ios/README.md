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

1. Configure ton Team / signing dans Xcode
2. Product → Archive → Distribute App → Development / Ad Hoc
3. Exporte `Anyloc.ipa` vers `apps/ios/dist/Anyloc.ipa`

Anyloc Setup installera ce fichier via USB.

## Configuration dans l'app

- URL API : `https://anyloc.io` (ou ton URL locale)
- Token : `anyloc_...` depuis le dashboard

## Renouvellement (LocalDevVPN)

Comme Wiped/Locaflex : renouvelle la signature toutes les ~7 jours via LocalDevVPN + bouton Renew dans l'app (à implémenter).
