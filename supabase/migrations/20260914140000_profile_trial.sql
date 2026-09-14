-- 1-hour trial: card captured at checkout, charge after trial_ends_at
alter table public.profiles
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_status text check (
    trial_status is null
    or trial_status in ('active', 'converted', 'cancelled', 'charge_failed')
  ),
  add column if not exists trial_payment_method_id text;

create index if not exists profiles_trial_charge_idx
  on public.profiles (trial_ends_at)
  where trial_status = 'active';

comment on column public.profiles.trial_started_at is
  'Set when the user validates their card (SetupIntent). Timer starts here.';
comment on column public.profiles.trial_ends_at is
  'When the off-session subscription charge should run (trial_started_at + 1h).';
comment on column public.profiles.trial_status is
  'active = in trial; converted = charged; cancelled = user opted out; charge_failed = payment failed.';
comment on column public.profiles.trial_payment_method_id is
  'Stripe payment_method id saved during trial setup checkout.';
