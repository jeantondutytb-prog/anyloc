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
- [ ] Auth obligatoire sur le dashboard

### Étape 2 — Anyloc Setup (desktop)
- [x] Shell Electron Mac + Windows (`apps/setup`)
- [ ] Détection USB iPhone + install sideload
- [ ] Hébergement des `.dmg` / `.exe` (variables `ANYLOC_DOWNLOAD_*`)

### Étape 3 — Apps mobiles
- [ ] App iOS (spoofing GPS système, lit `/api/device/location`)
- [x] Scaffold APK Android (`apps/android`) — mock location + sync API
- [ ] Build APK release + upload
- [ ] Renouvellement signature via LocalDevVPN (iOS)

### Étape 4 — Options
- [ ] Web spoofing (Snapchat web, etc.)
- [ ] Trajets simulés / routes

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

## Apps natives

| Projet | Chemin | Statut |
|--------|--------|--------|
| APK Android | `apps/android/` | Scaffold — mock location + poll API |
| Anyloc Setup | `apps/setup/` | Shell Electron — install USB à brancher |

Voir les README dans chaque dossier pour build et dev.

## Téléchargements

Configure les URLs des binaires dans `.env.local` :

- `ANYLOC_DOWNLOAD_SETUP_MAC` — Anyloc Setup `.dmg`
- `ANYLOC_DOWNLOAD_SETUP_WIN` — Anyloc Setup `.exe`
- `ANYLOC_DOWNLOAD_APK` — APK Android

Les liens `/api/downloads/{platform}` redirigent vers ces URLs si l'abonnement est actif (`subscription_status` = `active` ou `trialing`).
