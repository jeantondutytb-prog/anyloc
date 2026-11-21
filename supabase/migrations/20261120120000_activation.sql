-- Activation (audit du parcours, #5) : la 1re fois que la position d'un
-- client change vraiment, et le mail d'aide programmé 1 h après l'achat
-- (id Resend, pour l'annuler si la position change avant).
-- Écriture uniquement côté serveur (service role).

alter table public.profiles
  add column if not exists activated_at timestamptz,
  add column if not exists activation_source text,
  add column if not exists activation_help_email_id text;
