-- Les tokens appareil ne sont créés que par l'API (service role), après la
-- vérification de l'abonnement et de la limite d'appareils. Avec cette policy,
-- un utilisateur connecté pouvait insérer des lignes directement via l'API REST
-- Supabase et dépasser la limite.
drop policy if exists "Users can insert own device tokens" on public.device_tokens;
