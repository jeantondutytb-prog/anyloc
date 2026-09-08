-- Accès dev / admin pour tests sans abonnement Stripe.
-- Les emails listés dans ANYLOC_ADMIN_EMAILS sur Vercel ont aussi accès via l'app.

update public.profiles
set
  subscription_status = 'active',
  plan_id = 'admin',
  updated_at = now()
where lower(email) = lower('anyloc.contact@gmail.com');
