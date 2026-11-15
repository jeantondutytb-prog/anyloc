export const CHECKOUT_INTENT_COOKIE = "anyloc_checkout_intent";

/**
 * Set by the web remote's plans sheet when it opens the payment: the payment
 * then comes back to /app, where the setup popup takes over.
 */
export const CHECKOUT_RETURN_APP_COOKIE = "anyloc_checkout_return_app";

/** Where the web remote lands right after a payment. */
export const REMOTE_APP_PAID_PATH = "/app?paye=1";
