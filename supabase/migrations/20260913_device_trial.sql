alter table public.device_tokens
  add column if not exists is_trial boolean not null default false,
  add column if not exists trial_expires_at timestamptz;

create index if not exists device_tokens_trial_idx
  on public.device_tokens (user_id, is_trial)
  where is_trial = true;
