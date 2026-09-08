alter table public.location_settings
  add column if not exists mode text not null default 'static'
    check (mode in ('static', 'route'));

alter table public.location_settings
  add column if not exists route_waypoints jsonb;

alter table public.location_settings
  add column if not exists route_speed_kmh double precision not null default 40;

alter table public.location_settings
  add column if not exists route_started_at timestamptz;
