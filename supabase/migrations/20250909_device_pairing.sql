alter table public.device_tokens
  add column if not exists pairing_data text;
