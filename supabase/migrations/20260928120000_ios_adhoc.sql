create table if not exists public.ios_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'awaiting_udid'
    check (status in ('awaiting_udid', 'registered', 'failed')),
  enrollment_challenge_hash text not null,
  enrollment_expires_at timestamptz not null,
  udid text unique,
  product text,
  os_version text,
  asc_device_id text,
  error text,
  registered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ios_devices_user_created_idx
  on public.ios_devices (user_id, created_at desc);

alter table public.ios_devices enable row level security;

create policy "Users can read own ios devices"
  on public.ios_devices
  for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.ios_adhoc_builds (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued'
    check (status in ('queued', 'succeeded', 'failed')),
  udids text[] not null default '{}',
  ipa_blob_path text,
  bundle_version text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Un seul build en file à la fois (évite les doubles déclenchements concurrents).
create unique index if not exists ios_adhoc_builds_one_queued
  on public.ios_adhoc_builds ((true))
  where status = 'queued';

create index if not exists ios_adhoc_builds_created_idx
  on public.ios_adhoc_builds (created_at desc);

-- Service role uniquement : aucune policy.
alter table public.ios_adhoc_builds enable row level security;
