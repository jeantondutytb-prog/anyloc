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

## Prochaines étapes

- [x] Configurer Supabase Auth (voir `.env.example`)
- [ ] Apps natives iOS & Android
- [x] Webhooks Stripe pour gestion abonnements (voir ci-dessous)
- [ ] Spoofing web (Snapchat web, etc.)

## Stripe ↔ Supabase

1. Applique la migration `supabase/migrations/20250908140000_profiles_stripe.sql` dans Supabase (SQL Editor ou CLI).
2. Ajoute `SUPABASE_SERVICE_ROLE_KEY` et `STRIPE_WEBHOOK_SECRET` sur Vercel.
3. Dans Stripe Dashboard → Developers → Webhooks, crée un endpoint :
   - URL : `https://anyloc.io/api/stripe/webhook`
   - Events : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copie le signing secret dans `STRIPE_WEBHOOK_SECRET`.

Au checkout, l'email Supabase est prérempli et le compte est lié via `client_reference_id`. Le client Stripe est créé au paiement et enregistré dans `public.profiles`.
