create table if not exists public.checkout_session_redemptions (
  session_id text primary key,
  redeemed_at timestamptz not null default now()
);

alter table public.checkout_session_redemptions enable row level security;

create index if not exists checkout_session_redemptions_redeemed_at_idx
  on public.checkout_session_redemptions (redeemed_at);
