import { createHmac, timingSafeEqual } from "node:crypto";
import { RECOVERY_OFFER_PLAN_ID } from "@/lib/checkout-recovery-plan";

export { RECOVERY_OFFER_PLAN_ID };

/**
 * Relance des inscrits qui ouvrent le paiement sans payer.
 * Step 1 rappelle sans remise ; steps 2 et 3 offrent -50 % sur le 1er mois
 * (coupon Stripe RELANCE50, mensuel uniquement) jusqu'à `offerExpiresAt`.
 */

const HOUR_MS = 60 * 60 * 1000;

export const RECOVERY_STEPS = [
  { step: 1, delayMs: 1 * HOUR_MS },
  { step: 2, delayMs: 24 * HOUR_MS },
  { step: 3, delayMs: 72 * HOUR_MS },
] as const;

export type RecoveryStep = (typeof RECOVERY_STEPS)[number]["step"];

/** The -50 % stays valid one day after the last email. */
export const RECOVERY_OFFER_WINDOW_MS = 96 * HOUR_MS;

/** Past this, a stalled sequence is dropped rather than resumed. */
export const RECOVERY_MAX_AGE_MS = 7 * 24 * HOUR_MS;

export const RECOVERY_COUPON_ID = process.env.STRIPE_COUPON_RECOVERY ?? "RELANCE50";
export const RECOVERY_OFFER_PRICE = "4,95 €";
export const RECOVERY_FULL_PRICE = "9,90 €";

export type RecoveryState = {
  firstCheckoutAt: Date;
  stepsSent: number;
  offerExpiresAt: Date | null;
  convertedAt: Date | null;
  unsubscribedAt: Date | null;
};

/**
 * The step to send now, or null. When the cron fell behind, only the latest
 * due step goes out, so nobody gets two emails in the same hour.
 */
export function getDueRecoveryStep(state: RecoveryState, now: Date): RecoveryStep | null {
  if (state.convertedAt || state.unsubscribedAt) return null;

  const elapsed = now.getTime() - state.firstCheckoutAt.getTime();
  if (elapsed > RECOVERY_MAX_AGE_MS) return null;

  let due: RecoveryStep | null = null;
  for (const { step, delayMs } of RECOVERY_STEPS) {
    if (step > state.stepsSent && elapsed >= delayMs) {
      due = step;
    }
  }
  return due;
}

export function getRecoveryOfferExpiry(firstCheckoutAt: Date) {
  return new Date(firstCheckoutAt.getTime() + RECOVERY_OFFER_WINDOW_MS);
}

export function isRecoveryOfferActive(state: RecoveryState, now: Date) {
  return (
    !state.convertedAt &&
    state.stepsSent >= 2 &&
    state.offerExpiresAt !== null &&
    now < state.offerExpiresAt
  );
}

function getUnsubscribeSecret() {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("CRON_SECRET is required to sign unsubscribe links.");
  }
  return secret ?? "dev-unsubscribe-secret";
}

export function signUnsubscribeToken(userId: string) {
  return createHmac("sha256", getUnsubscribeSecret())
    .update(`unsubscribe:${userId}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(userId: string, token: string) {
  const expected = Buffer.from(signUnsubscribeToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function formatOfferDeadline(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type RecoveryEmail = { subject: string; html: string; text: string };

export function buildRecoveryEmail({
  step,
  appUrl,
  planId,
  offerExpiresAt,
  unsubscribeUrl,
}: {
  step: RecoveryStep;
  appUrl: string;
  planId: string;
  offerExpiresAt: Date | null;
  unsubscribeUrl: string;
}): RecoveryEmail {
  const checkoutPlan = step === 1 ? planId : RECOVERY_OFFER_PLAN_ID;
  const ctaUrl =
    `${appUrl}/checkout?plan=${encodeURIComponent(checkoutPlan)}` +
    `&utm_source=email&utm_medium=email&utm_campaign=checkout_recovery&utm_content=step${step}`;
  const deadline = offerExpiresAt ? formatOfferDeadline(offerExpiresAt) : null;

  const content = {
    1: {
      subject: "Ton accès Anyloc t'attend",
      paragraphs: [
        "Salut,",
        "Ton compte Anyloc est prêt, il ne manque plus que le paiement pour débloquer ton accès.",
        "Change ta localisation sur Snap, Insta, Tinder et tous tes jeux en quelques secondes, depuis ton PC ou ton Mac.",
      ],
      cta: "Débloquer mon accès",
    },
    2: {
      subject: `Ton 1er mois à ${RECOVERY_OFFER_PRICE}`,
      paragraphs: [
        "Salut,",
        `Pour t'aider à te lancer : -50 % sur ton premier mois, soit ${RECOVERY_OFFER_PRICE} au lieu de ${RECOVERY_FULL_PRICE}.`,
        "Plus de 10 000 utilisateurs, noté 4,6/5 sur Trustpilot. Sans engagement, tu annules en 1 clic depuis ton compte.",
        deadline ? `L'offre est valable jusqu'à ${deadline}.` : "L'offre est valable quelques jours.",
      ],
      cta: `Mon 1er mois à ${RECOVERY_OFFER_PRICE}`,
    },
    3: {
      subject: `Dernier jour pour ton mois à ${RECOVERY_OFFER_PRICE}`,
      paragraphs: [
        "Salut,",
        `Petit rappel : ton premier mois à ${RECOVERY_OFFER_PRICE} au lieu de ${RECOVERY_FULL_PRICE} expire bientôt${deadline ? ` (${deadline})` : ""}.`,
        "Après, ce sera le prix normal. Sans engagement, annulable en 1 clic.",
      ],
      cta: "Profiter de -50 %",
    },
  }[step];

  const signature = "Une question ? Réponds simplement à ce mail, je lis tout.\n\nJean, fondateur d'Anyloc";
  const footer =
    "Tu reçois cet email parce que tu as créé un compte sur anyloc.io sans finaliser ton abonnement.";

  const text = [
    ...content.paragraphs,
    `${content.cta} : ${ctaUrl}`,
    signature,
    "—",
    footer,
    `Ne plus recevoir ces emails : ${unsubscribeUrl}`,
  ].join("\n\n");

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
${content.paragraphs
  .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${escapeHtml(p)}</p>`)
  .join("\n")}
<p style="margin:24px 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:12px">${escapeHtml(content.cta)}</a></p>
<p style="margin:0;font-size:14px;line-height:1.5;color:#52525b">Une question ? Réponds simplement à ce mail, je lis tout.<br><br>Jean, fondateur d'Anyloc</p>
</td></tr></table>
<p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#a1a1aa">${escapeHtml(footer)}<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#a1a1aa">Ne plus recevoir ces emails</a></p>
</td></tr></table>
</body></html>`;

  return { subject: content.subject, html, text };
}
