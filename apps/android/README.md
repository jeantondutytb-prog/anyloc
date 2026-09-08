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
# Depuis la racine du repo
./scripts/build-android.sh
```

Ou manuellement :

```bash
cd apps/android
./gradlew assembleRelease
```

L'APK se trouve dans `dist/android/Anyloc.apk` (via le script) ou `app/build/outputs/apk/release/`.

### Signature release (production)

```bash
cp keystore.properties.example keystore.properties
# Édite keystore.properties + génère ton keystore
keytool -genkey -v -keystore anyloc-release.keystore -alias anyloc -keyalg RSA -keysize 2048 -validity 10000
```

Sans `keystore.properties`, le build release utilise la clé debug (OK pour tests internes).

### CI

GitHub Actions build l'APK automatiquement sur push (`/.github/workflows/build-android.yml`). Télécharge l'artifact depuis l'onglet Actions.

## API utilisée

- `GET /api/device/location` — header `Authorization: Bearer <token>`
- `GET /api/device/me` — vérifie le token et l'abonnement

## Architecture

- `AnylocApi` — client HTTP
- `MockLocationService` — foreground service qui poll l'API toutes les 15s
- `MockLocationProvider` — injecte lat/lng via `LocationManager` test provider
