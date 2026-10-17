import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;
let loadedKey = "";

/**
 * Stripe.js, loaded once per page. The paywall calls it on display so the
 * script is already there when "Continuer" opens the payment popup.
 */
export function getStripe(publishableKey: string) {
  if (!stripePromise || loadedKey !== publishableKey) {
    loadedKey = publishableKey;
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}
