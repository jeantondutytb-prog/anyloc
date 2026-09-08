# Anyloc

SaaS de modification de position GPS — concurrent de [wiped.me](https://www.wiped.me/) et inspiré de [locaflex.io](https://www.locaflex.io/), mais multi-apps (pas limité à Snapchat).

**Domaine :** [anyloc.io](https://anyloc.io)

## Fonctionnalités

- Landing page marketing (FR)
- Dashboard avec carte interactive (Leaflet)
- Lieux favoris et activation spoofing
- Guides d'installation iOS & Android
- Intégration Stripe (abonnements)
- Pages auth (login / signup)

## Stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- Leaflet / react-leaflet
- Stripe
- Framer Motion

## Démarrage

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

Copie `.env.example` vers `.env.local` :

```bash
cp .env.example .env.local
```

## Déploiement

Optimisé pour [Vercel](https://vercel.com). Configure le domaine `anyloc.io` dans les paramètres du projet.

## Roadmap produit

### Étape 1 — Plateforme web
- [x] Dashboard + sync position (`/api/location`, table `location_settings`)
- [x] Téléchargements gated par abonnement (`/api/downloads`)
- [x] Guides iOS/Android alignés (Setup desktop + mode dev + LocalDevVPN)
- [x] API device tokens (`/api/device`, `/api/device/location`)
- [x] Auth obligatoire sur le dashboard

### Étape 2 — Anyloc Setup (desktop)
- [x] Shell Electron Mac + Windows (`apps/setup`)
- [x] Détection USB iPhone (`pymobiledevice3` / `idevice_id`)
- [x] Install IPA iOS via USB (`pymobiledevice3 apps install`)
- [ ] Hébergement des `.dmg` / `.exe` (variables `ANYLOC_DOWNLOAD_*`)

### Étape 3 — Apps mobiles
- [x] Scaffold app iOS SwiftUI (`apps/ios`) + xcodegen
- [x] APK Android buildable + CI GitHub Actions
- [x] Script upload Vercel Blob (`scripts/upload-release.mjs`)
- [ ] Spoofing GPS système iOS (entitlements)
- [ ] Renouvellement signature via LocalDevVPN (iOS)

### Étape 4 — Options
- [x] Web spoofing (`/web` — override `navigator.geolocation`)
- [x] Trajets simulés (`/dashboard/routes` + interpolation serveur)
- [x] Auth obligatoire sur le dashboard
- [x] Install IPA via `pymobiledevice3 apps install`
- [x] Guide renouvellement LocalDevVPN (app iOS)

## Prochaines étapes techniques

- [x] Configurer Supabase Auth (voir `.env.example`)
- [x] Webhooks Stripe pour gestion abonnements (voir ci-dessous)
- [x] Migration `location_settings` (voir `supabase/migrations/`)
- [ ] Apps natives iOS & Android

## Stripe ↔ Supabase

1. Applique la migration `supabase/migrations/20250908140000_profiles_stripe.sql` dans Supabase (SQL Editor ou CLI).
2. Ajoute `SUPABASE_SERVICE_ROLE_KEY` et `STRIPE_WEBHOOK_SECRET` sur Vercel.
3. Dans Stripe Dashboard → Developers → Webhooks, crée un endpoint :
   - URL : `https://anyloc.io/api/stripe/webhook`
   - Events : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copie le signing secret dans `STRIPE_WEBHOOK_SECRET`.

Au checkout, l'email Supabase est prérempli et le compte est lié via `client_reference_id`. Le client Stripe est créé au paiement et enregistré dans `public.profiles`.

## Sync position (dashboard ↔ apps)

1. Applique les migrations dans `supabase/migrations/`.
2. Le dashboard lit/écrit via `GET` et `PUT` `/api/location` (auth Supabase requise).
3. Lie un appareil depuis le dashboard → token `anyloc_...`.
4. L'app mobile lit la position via `GET /api/device/location` avec `Authorization: Bearer <token>`.
5. **Trajets simulés** : `/dashboard/routes` — la position avance automatiquement le long du tracé.
6. **Web spoofing** : `/web` — override `navigator.geolocation` pour Snapchat Web, Insta Web, etc.

## Apps natives

| Projet | Chemin | Statut |
|--------|--------|--------|
| APK Android | `apps/android/` | Buildable — `./scripts/build-android.sh` |
| App iOS | `apps/ios/` | Scaffold SwiftUI + xcodegen |
| Anyloc Setup | `apps/setup/` | Electron + détection USB |

Voir les README dans chaque dossier pour build et dev.

## Release (APK / Setup)

```bash
# Build APK
./scripts/build-android.sh

# Upload vers Vercel Blob (puis copie l'URL dans ANYLOC_DOWNLOAD_APK)
BLOB_READ_WRITE_TOKEN=xxx node scripts/upload-release.mjs android dist/android/Anyloc.apk
```

## Téléchargements

Configure les URLs des binaires dans `.env.local` :

- `ANYLOC_DOWNLOAD_SETUP_MAC` — Anyloc Setup `.dmg`
- `ANYLOC_DOWNLOAD_SETUP_WIN` — Anyloc Setup `.exe`
- `ANYLOC_DOWNLOAD_APK` — APK Android

Les liens `/api/downloads/{platform}` redirigent vers ces URLs si l'abonnement est actif (`subscription_status` = `active` ou `trialing`).
