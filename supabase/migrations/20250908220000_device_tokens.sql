create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  device_name text not null default 'Mon appareil',
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists device_tokens_user_id_idx
  on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

create policy "Users can read own device tokens"
  on public.device_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own device tokens"
  on public.device_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own device tokens"
  on public.device_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);
