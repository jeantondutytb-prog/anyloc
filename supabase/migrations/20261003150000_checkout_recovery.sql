-- Relance des inscrits qui ouvrent le paiement sans payer (emails 1 h / 24 h / 72 h)
-- et alertes ops (ex. aucune vente depuis 4 h).
-- Écriture uniquement côté serveur via la service role : RLS activée sans policy.

create table if not exists public.checkout_recoveries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  plan_id text not null,
  first_checkout_at timestamptz not null default now(),
  steps_sent smallint not null default 0,
  last_sent_at timestamptz,
  offer_expires_at timestamptz,
  converted_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists checkout_recoveries_pending_idx
  on public.checkout_recoveries (first_checkout_at)
  where converted_at is null and unsubscribed_at is null and steps_sent < 3;

alter table public.checkout_recoveries enable row level security;

create table if not exists public.ops_alerts (
  key text primary key,
  last_sent_at timestamptz not null
);

alter table public.ops_alerts enable row level security;
