-- One row per visitor message the Crisp support agent picked up: claims the
-- message (Crisp retries hooks) and keeps what the agent decided, for review.
create table if not exists public.support_agent_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  fingerprint bigint not null,
  mode text not null check (mode in ('draft', 'live')),
  status text not null default 'pending'
    check (status in ('pending', 'superseded', 'human_active', 'done', 'error')),
  action text check (action in ('reply', 'escalate', 'ignore')),
  reply text,
  reason text,
  internal_note text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (session_id, fingerprint)
);

create index if not exists support_agent_events_created_at_idx
  on public.support_agent_events (created_at desc);

-- Server-only table: RLS on, no policy, so only the service role reads it.
alter table public.support_agent_events enable row level security;
