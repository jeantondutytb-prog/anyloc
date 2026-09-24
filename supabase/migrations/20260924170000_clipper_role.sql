-- Rôle clipper : accès produit complet sans abonnement Stripe (créateurs de contenu).
-- Les emails listés dans ANYLOC_CLIPPER_EMAILS sur Vercel ont aussi accès via l'app.

alter table public.profiles
  add column if not exists is_clipper boolean not null default false;
