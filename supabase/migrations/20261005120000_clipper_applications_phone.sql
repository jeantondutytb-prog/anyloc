-- Numéro de portable facultatif (format +33…) pour recontacter les clippeurs
-- par SMS / WhatsApp quand ils ne répondent pas sur Instagram.
alter table public.clipper_applications
  add column if not exists phone text;
