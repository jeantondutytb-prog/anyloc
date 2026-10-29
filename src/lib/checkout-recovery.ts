import { createHmac, timingSafeEqual } from "node:crypto";
import { RECOVERY_OFFER_PLAN_ID } from "@/lib/checkout-recovery-plan";

export { RECOVERY_OFFER_PLAN_ID };

/**
 * Offre de bienvenue et relance des inscrits qui voient le paywall sans payer.
 * Dès le 1er paywall : -50 % sur le 1er mois (coupon Stripe RELANCE50, mensuel
 * uniquement) jusqu'au lendemain minuit, heure de Paris (`offerExpiresAt`),
 * puis prix normal. Step 1 (1 h) annonce l'offre, step 2 la rappelle les
 * dernières heures, step 3 (72 h) relance sans remise.
 *
 * Un délai court fait agir (bons valables 3 semaines utilisés deux fois plus
 * que ceux de 2 mois, Shu & Gneezy 2010) et les achats se font surtout juste
 * avant l'échéance ; un jour entier laisse le temps de trouver l'argent, quand
 * la moitié des refus de carte sont des comptes vides.
 */

const HOUR_MS = 60 * 60 * 1000;

export type RecoveryStep = 1 | 2 | 3;

const FIRST_EMAIL_DELAY_MS = 1 * HOUR_MS;
/** The last call goes out this long before the offer ends (18:00 Paris). */
const LAST_CALL_BEFORE_EXPIRY_MS = 6 * HOUR_MS;
const LAST_EMAIL_DELAY_MS = 72 * HOUR_MS;

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
 * due step goes out, so nobody gets two emails in the same hour. The last
 * call only goes out while the offer runs: never for an offer already gone.
 */
export function getDueRecoveryStep(state: RecoveryState, now: Date): RecoveryStep | null {
  if (state.convertedAt || state.unsubscribedAt) return null;

  const elapsed = now.getTime() - state.firstCheckoutAt.getTime();
  if (elapsed > RECOVERY_MAX_AGE_MS) return null;

  const expiry = state.offerExpiresAt?.getTime();
  const due = {
    1: elapsed >= FIRST_EMAIL_DELAY_MS,
    2:
      expiry !== undefined &&
      now.getTime() >= expiry - LAST_CALL_BEFORE_EXPIRY_MS &&
      now.getTime() < expiry,
    3: elapsed >= LAST_EMAIL_DELAY_MS,
  };
  for (const step of [3, 2, 1] as const) {
    if (step > state.stepsSent && due[step]) return step;
  }
  return null;
}

const PARIS = "Europe/Paris";

/** Minutes Paris is ahead of UTC at `date` (60 in winter, 120 in summer). */
function getParisOffsetMinutes(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: PARIS,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
      .formatToParts(date)
      .map((part) => [part.type, Number(part.value)])
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/**
 * End (23:59:59 Paris) of the day after the first paywall: "jusqu'à demain
 * minuit", between 24 and 48 h.
 */
export function getRecoveryOfferExpiry(firstCheckoutAt: Date) {
  const target = new Date(firstCheckoutAt.getTime() + 24 * HOUR_MS);
  const offset = getParisOffsetMinutes(target);
  const parisWallClock = new Date(target.getTime() + offset * 60000);
  const endOfDayWallClock = Date.UTC(
    parisWallClock.getUTCFullYear(),
    parisWallClock.getUTCMonth(),
    parisWallClock.getUTCDate(),
    23,
    59,
    59
  );
  return new Date(endOfDayWallClock - offset * 60000);
}

export function isRecoveryOfferActive(state: RecoveryState, now: Date) {
  return !state.convertedAt && state.offerExpiresAt !== null && now < state.offerExpiresAt;
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
    day: "numeric",
    month: "long",
    timeZone: PARIS,
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
  // Steps 1 and 2 carry the welcome offer when it runs; step 3 comes after it.
  const offer = step < 3 && offerExpiresAt !== null;
  const checkoutPlan = offer ? RECOVERY_OFFER_PLAN_ID : planId;
  const ctaUrl =
    `${appUrl}/checkout?plan=${encodeURIComponent(checkoutPlan)}&paiement=1` +
    `&utm_source=email&utm_medium=email&utm_campaign=checkout_recovery&utm_content=step${step}`;
  const deadline = offerExpiresAt ? formatOfferDeadline(offerExpiresAt) : null;

  const reminder = {
    subject: "Ton accès Anyloc t'attend",
    paragraphs: [
      "Salut,",
      "Ton compte Anyloc est prêt, il ne manque plus que le paiement pour débloquer ton accès.",
      "Change ta localisation sur Snap, Insta, Tinder et tous tes jeux en quelques secondes, depuis ton PC ou ton Mac.",
    ],
    cta: "Débloquer mon accès",
  };
  const content = !offer
    ? reminder
    : step === 1
      ? {
          subject: `Ton 1er mois à ${RECOVERY_OFFER_PRICE}, pour peu de temps`,
          paragraphs: [
            "Salut,",
            `Ton compte Anyloc est prêt. Pour t'aider à te lancer : -50 % sur ton premier mois, soit ${RECOVERY_OFFER_PRICE} au lieu de ${RECOVERY_FULL_PRICE}.`,
            "Plus de 10 000 utilisateurs, noté 4,6/5 sur Trustpilot. Sans engagement, tu annules en 1 clic depuis ton compte.",
            `L'offre est valable jusqu'à ${deadline} à minuit. Après, ce sera le prix normal.`,
          ],
          cta: `Mon 1er mois à ${RECOVERY_OFFER_PRICE}`,
        }
      : {
          subject: `Ce soir minuit : fin de ton mois à ${RECOVERY_OFFER_PRICE}`,
          paragraphs: [
            "Salut,",
            `Dernières heures : ton premier mois à ${RECOVERY_OFFER_PRICE} au lieu de ${RECOVERY_FULL_PRICE} expire ce soir à minuit.`,
            "Après, ce sera le prix normal. Sans engagement, annulable en 1 clic.",
          ],
          cta: "Profiter de -50 %",
        };

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
