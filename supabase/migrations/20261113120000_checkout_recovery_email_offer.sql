-- Mail unique 15 min après le 1er paywall (voir src/lib/checkout-email-offer.ts) :
-- le bras du test (remise ou simple rappel), l'heure d'envoi programmée chez
-- Resend, la fin de la remise de 2 h et l'id Resend pour annuler si on paie avant.

alter table public.checkout_recoveries
  add column if not exists email_offer_variant text,
  add column if not exists email_offer_send_at timestamptz,
  add column if not exists email_offer_expires_at timestamptz,
  add column if not exists email_offer_email_id text;
