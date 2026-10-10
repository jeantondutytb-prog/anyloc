-- Vues TikTok des comptes Anyloc, relevées chaque soir par /api/cron/tiktok-views.
-- Écriture et lecture uniquement côté serveur via la service role : RLS activée sans policy.

-- Compteur de vues de chaque vidéo à la date du relevé (date de Paris).
-- Seuls les derniers jours sont gardés : ils servent de point de comparaison.
create table if not exists public.tiktok_video_snapshots (
  snapshot_date date not null,
  account text not null,
  video_id text not null,
  video_created_at timestamptz,
  play_count bigint not null,
  taken_at timestamptz not null default now(),
  primary key (snapshot_date, video_id)
);

create index if not exists tiktok_video_snapshots_account_date_idx
  on public.tiktok_video_snapshots (account, snapshot_date);

alter table public.tiktok_video_snapshots enable row level security;

-- Vues gagnées par compte depuis le relevé précédent (previous_date).
create table if not exists public.tiktok_daily_views (
  day date not null,
  account text not null,
  views bigint not null,
  previous_date date not null,
  videos_tracked integer not null,
  created_at timestamptz not null default now(),
  primary key (day, account)
);

alter table public.tiktok_daily_views enable row level security;
