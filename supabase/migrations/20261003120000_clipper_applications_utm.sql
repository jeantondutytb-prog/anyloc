-- Source de la candidature (utm_campaign du lien, ex. clippeurs_mail3) pour mesurer chaque envoi.
alter table public.clipper_applications
  add column if not exists utm_campaign text;
