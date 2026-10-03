-- Candidatures au programme clippeurs (formulaire public /clippeurs).
-- Écriture uniquement côté serveur via la service role : RLS activée sans policy.

create table if not exists public.clipper_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  first_name text not null,
  instagram text not null,
  videos_per_day text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists clipper_applications_instagram_key
  on public.clipper_applications (instagram);

alter table public.clipper_applications enable row level security;
