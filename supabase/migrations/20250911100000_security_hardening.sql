alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

create index if not exists stripe_webhook_events_processed_at_idx
  on public.stripe_webhook_events (processed_at);
