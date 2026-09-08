# Anyloc Android

App Android qui lit la position depuis l'API Anyloc et l'applique en mock location.

## Prérequis

- Android Studio (Ladybug+)
- Android SDK 34+
- Téléphone ou émulateur Android 10+
- Options développeur → **Application de localisation fictive** → Anyloc

## Configuration

1. Génère un token depuis le dashboard web (`Token Android`).
2. Ouvre l'app et colle le token + URL API (`https://anyloc.io` ou ton URL locale).
3. Active le spoofing dans l'app.

## Build APK

```bash
cd apps/android
./gradlew assembleRelease
```

L'APK se trouve dans `app/build/outputs/apk/release/`.

## API utilisée

- `GET /api/device/location` — header `Authorization: Bearer <token>`
- `GET /api/device/me` — vérifie le token et l'abonnement

## Architecture

- `AnylocApi` — client HTTP
- `MockLocationService` — foreground service qui poll l'API toutes les 15s
- `MockLocationProvider` — injecte lat/lng via `LocationManager` test provider
