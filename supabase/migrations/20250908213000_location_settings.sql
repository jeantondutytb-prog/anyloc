create table if not exists public.location_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  lat double precision not null default 0,
  lng double precision not null default 0,
  accuracy double precision not null default 10,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.location_settings enable row level security;

create policy "Users can read own location settings"
  on public.location_settings
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own location settings"
  on public.location_settings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own location settings"
  on public.location_settings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists location_settings_active_idx
  on public.location_settings (is_active)
  where is_active = true;
