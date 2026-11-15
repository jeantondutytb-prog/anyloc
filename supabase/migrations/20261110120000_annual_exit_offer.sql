-- Offre annuelle de sortie : heure du premier affichage de l'offre (29 € au lieu de 49 €),
-- qui reste ouverte 2 h à partir de là, une seule fois par compte.
-- Écrite uniquement côté serveur via la service role ; null tant que l'offre n'a pas été montrée.

alter table public.profiles
  add column if not exists annual_exit_offer_started_at timestamptz;
