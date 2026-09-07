# Anyloc

SaaS de modification de position GPS — concurrent de [wiped.me](https://www.wiped.me/) et inspiré de [locaflex.io](https://www.locaflex.io/), mais multi-apps (pas limité à Snapchat).

**Domaine :** [anyloc.io](https://anyloc.io)

## Fonctionnalités

- Landing page marketing (FR)
- Dashboard avec carte interactive (Leaflet)
- Lieux favoris et activation spoofing
- Guides d'installation iOS & Android
- Intégration Stripe (abonnements + essai 3 jours)
- Pages auth (login / register)

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

- [ ] Auth réelle (Supabase / Clerk)
- [ ] Apps natives iOS & Android
- [ ] Webhooks Stripe pour gestion abonnements
- [ ] Spoofing web (Snapchat web, etc.)
