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

### Étape 2 — Anyloc Setup (Mac)
- [x] App Electron Mac avec auth Supabase
- [x] Détection USB iPhone + install app via `pymobiledevice3`
- [x] Auto-sync position depuis Supabase (l'iPhone sert de télécommande)
- [x] GPS persistant (re-apply toutes les 5s)
- [x] Auto-launch au démarrage Mac + mode tray
- [x] Interface identique à l'app iPhone (3 onglets)
- [ ] Hébergement du `.dmg` (variable `ANYLOC_DOWNLOAD_SETUP_MAC`)

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
   - URL : `https://www.anyloc.io/api/stripe/webhook` (avec `www` — `anyloc.io` renvoie une 308 et Stripe ne suit pas les redirections)
   - Events : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copie le signing secret dans `STRIPE_WEBHOOK_SECRET`.

Au checkout, l'email Supabase est prérempli et le compte est lié via `client_reference_id`. Le client Stripe est créé au paiement et enregistré dans `public.profiles`.

## Sync position (iPhone ↔ Mac)

1. L'utilisateur choisit un lieu sur l'app iPhone (ou le dashboard web).
2. L'app écrit dans la table `location_settings` via Supabase (auth JWT).
3. Anyloc Setup (Mac) lit `location_settings` en temps réel et applique le spoof GPS via `pymobiledevice3`.
4. Le GPS est ré-appliqué toutes les 5s pour rester actif.
5. **Trajets simulés** : `/dashboard/routes` — la position avance automatiquement le long du tracé.
6. **Web spoofing** : `/web` — override `navigator.geolocation` pour Snapchat Web, Insta Web, etc.

## Apps natives

| Projet | Chemin | Statut |
|--------|--------|--------|
| APK Android | `apps/android/` | Buildable — `./scripts/build-android.sh` |
| App iOS | `apps/ios/` | Scaffold SwiftUI + xcodegen |
| Anyloc Setup | `apps/setup/` | Electron Mac — auto-sync GPS via USB |

Voir les README dans chaque dossier pour build et dev.

## Release (APK / Setup)

### Build local

```bash
# APK Android
./scripts/build-android.sh

# Anyloc Setup (Mac uniquement)
cd apps/setup && npm run build:mac
```

### CI (recommandé)

Le workflow `.github/workflows/build-setup.yml` build automatiquement :
- **Mac** → `Anyloc-Setup.dmg`

Déclenchement : push sur `main` ou manuel dans GitHub Actions → **Build Anyloc Setup**.

### Upload vers Vercel Blob

1. Crée un store Blob sur [Vercel Dashboard](https://vercel.com/dashboard/stores)
2. Ajoute `BLOB_READ_WRITE_TOKEN` dans les secrets GitHub du repo
3. Relance le workflow — les fichiers sont uploadés automatiquement
4. Copie les URLs affichées dans les variables Vercel :

```bash
# Manuel si besoin
BLOB_READ_WRITE_TOKEN=xxx node scripts/upload-release.mjs setup-mac apps/setup/dist/Anyloc-Setup.dmg
BLOB_READ_WRITE_TOKEN=xxx node scripts/upload-release.mjs android dist/android/Anyloc.apk
```

## Téléchargements

Configure les URLs des binaires dans `.env.local` :

- `ANYLOC_DOWNLOAD_SETUP_MAC` — Anyloc Setup `.dmg`
- `ANYLOC_DOWNLOAD_APK` — APK Android

Les liens `/api/downloads/{platform}` redirigent vers ces URLs si l'abonnement est actif (`subscription_status` = `active`), ou si le compte est admin (`ANYLOC_ADMIN_EMAILS`).

## Accès admin (dev)

Ajoute sur Vercel :

```bash
ANYLOC_ADMIN_EMAILS=anyloc.contact@gmail.com
```

Les comptes listés ont accès complet sans payer (téléchargements, tokens appareil, etc.).
