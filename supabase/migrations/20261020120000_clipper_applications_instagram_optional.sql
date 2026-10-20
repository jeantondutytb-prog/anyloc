-- Le formulaire /clippeurs ne demande plus l'Instagram : le contact passe par
-- le numéro (obligatoire) et le message WhatsApp envoyé à la fin.
alter table public.clipper_applications
  alter column instagram drop not null;
