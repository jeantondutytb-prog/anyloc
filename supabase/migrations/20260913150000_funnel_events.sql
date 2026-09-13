-- Tracking minimal du funnel (vue checkout -> session Stripe -> achat confirmé)
-- pour retrouver de la visibilité depuis que la création de compte se fait
-- après l'achat (le nombre de profils ne reflète plus que les acheteurs).
create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  plan_id text,
  email text,
  stripe_session_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists funnel_events_event_created_at_idx
  on public.funnel_events (event, created_at);

alter table public.funnel_events enable row level security;

-- Seul le service role (utilisé côté serveur via le client admin) peut écrire/lire.
-- Aucune policy pour "authenticated"/"anon" : accès bloqué par défaut avec RLS activé.
