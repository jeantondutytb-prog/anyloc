import { createHash } from "node:crypto";

/**
 * Mail de relance unique, 15 min après le 1er paywall sans paiement, sur le
 * modèle de Remakeit : un seul mail, une remise sur la formule regardée,
 * valable 2 h pour de vrai (le serveur ne pose le coupon que dans la fenêtre).
 *
 * La moitié des inscrits reçoit le mail sans remise (simple rappel) : l'offre
 * de bienvenue -50 % n'avait pas augmenté la conversion et avait fait chuter
 * le revenu par visiteur (arrêtée le 30/10), on mesure donc si la remise
 * rapporte plus qu'elle ne coûte avant de la donner à tout le monde.
 */

const MINUTE_MS = 60 * 1000;

/** The email goes out this long after the first paywall view. */
export const EMAIL_OFFER_DELAY_MS = 15 * MINUTE_MS;
/** The discount it announces lasts this long once the email is out. */
export const EMAIL_OFFER_WINDOW_MS = 2 * 60 * MINUTE_MS;
/** Share of enrolled users who get the discount; the others get a plain reminder. */
export const EMAIL_OFFER_DISCOUNT_SHARE = 0.5;

export type EmailOfferVariant = "discount" | "reminder";

export type EmailOffer = {
  /** Stripe coupon applied to the checkout while the offer runs (created on first use). */
  couponId: string;
  amountOffCents: number;
  offerPrice: string;
  fullPrice: string;
  /** "Anyloc à vie", "ton abonnement annuel"... */
  label: string;
  /** What the discount covers, after "soit". */
  scope: string;
};

const LIFETIME: EmailOffer = {
  couponId: "RELANCE_MAIL_20EUR",
  amountOffCents: 2000,
  offerPrice: "69 €",
  fullPrice: "89 €",
  label: "Anyloc à vie",
  scope: "payé une seule fois, à toi pour toujours",
};

const ANNUAL: EmailOffer = {
  couponId: "RELANCE_MAIL_10EUR",
  amountOffCents: 1000,
  offerPrice: "39 €",
  fullPrice: "49 €",
  label: "ton année Anyloc",
  scope: "ta première année complète",
};

const MONTHLY: EmailOffer = {
  couponId: "RELANCE_MAIL_2EUR",
  amountOffCents: 200,
  offerPrice: "7,90 €",
  fullPrice: "9,90 €",
  label: "ton premier mois Anyloc",
  scope: "sans engagement, annulable en 1 clic",
};

/** Plans of the live grids (v1 and v3); the others get the reminder only. */
export const EMAIL_OFFERS: Record<string, EmailOffer> = {
  lifetime: LIFETIME,
  annual: ANNUAL,
  annual_v3: ANNUAL,
  monthly: MONTHLY,
  monthly_v3: MONTHLY,
};

export function getEmailOffer(planId: string): EmailOffer | null {
  return EMAIL_OFFERS[planId] ?? null;
}

/** What the paywall needs to show the running discount: its end and the price of each plan. */
export type PaywallEmailOffer = {
  endsAt: string;
  prices: Record<string, { offerPrice: string; fullPrice: string }>;
};

export function toPaywallEmailOffer(endsAt: string): PaywallEmailOffer {
  return {
    endsAt,
    prices: Object.fromEntries(
      Object.entries(EMAIL_OFFERS).map(([planId, offer]) => [
        planId,
        { offerPrice: offer.offerPrice, fullPrice: offer.fullPrice },
      ])
    ),
  };
}

/** The coupons of the offer, for the lifetime plan too (a one-time payment takes no other coupon). */
export function isEmailOfferCoupon(couponId: string) {
  return Object.values(EMAIL_OFFERS).some((offer) => offer.couponId === couponId);
}

/** Stable per user, so a second paywall view never changes the arm. */
export function pickEmailOfferVariant(userId: string, share = EMAIL_OFFER_DISCOUNT_SHARE): EmailOfferVariant {
  const bucket = createHash("sha256").update(`email-offer:${userId}`).digest().readUInt32BE(0) / 0x1_0000_0000;
  return bucket < share ? "discount" : "reminder";
}

export type EmailOfferSchedule = {
  variant: EmailOfferVariant;
  sendAt: Date;
  /** End of the discount; null for the reminder, or a plan without an offer. */
  expiresAt: Date | null;
};

export function planEmailOffer(userId: string, planId: string, firstViewAt: Date): EmailOfferSchedule {
  const variant = getEmailOffer(planId) ? pickEmailOfferVariant(userId) : "reminder";
  const sendAt = new Date(firstViewAt.getTime() + EMAIL_OFFER_DELAY_MS);
  return {
    variant,
    sendAt,
    expiresAt: variant === "discount" ? new Date(sendAt.getTime() + EMAIL_OFFER_WINDOW_MS) : null,
  };
}

/** The discount runs from the email (never before: no silent discount on the paywall) to its end. */
export function isEmailOfferActive(
  input: { sendAt: Date | null; expiresAt: Date | null; convertedAt: Date | null },
  now: Date
) {
  return (
    !input.convertedAt &&
    input.sendAt !== null &&
    input.expiresAt !== null &&
    now >= input.sendAt &&
    now < input.expiresAt
  );
}

/** "14 h 32", Paris time. */
export function formatParisTime(date: Date) {
  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(date);
  return time.replace(":", " h ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type EmailOfferMessage = { subject: string; html: string; text: string };

/**
 * Same plain subject in both arms: no emoji, price or deadline, which spam
 * filters weigh, and the A/B test then only compares the body.
 */
export const RECOVERY_SUBJECT = "Tu y étais presque";

export function buildEmailOfferEmail({
  planId,
  variant,
  expiresAt,
  appUrl,
  unsubscribeUrl,
}: {
  planId: string;
  variant: EmailOfferVariant;
  expiresAt: Date | null;
  appUrl: string;
  unsubscribeUrl: string;
}): EmailOfferMessage {
  const offer = variant === "discount" && expiresAt ? getEmailOffer(planId) : null;
  const ctaUrl =
    `${appUrl}/checkout?plan=${encodeURIComponent(planId)}&paiement=1` +
    `&utm_source=email&utm_medium=email&utm_campaign=checkout_recovery&utm_content=mail15_${variant}`;

  const content = offer
    ? {
        subject: RECOVERY_SUBJECT,
        paragraphs: [
          "Salut,",
          "Tu étais à deux doigts de débloquer Anyloc, ce serait dommage de t'arrêter là.",
          `Je te réserve une réduction valable 2 h : ${offer.label} à ${offer.offerPrice} au lieu de ${offer.fullPrice}, ${offer.scope}.`,
          "Change ta position sur Snap, Insta, Tinder et tes jeux en quelques secondes. Plus de 10 000 utilisateurs, noté 4,6/5 sur Trustpilot.",
          `La réduction est déjà appliquée sur le lien ci-dessous, jusqu'à ${formatParisTime(expiresAt!)}. Après, ce sera le prix normal.`,
        ],
        cta: `Je profite de ${offer.offerPrice}`,
      }
    : {
        subject: RECOVERY_SUBJECT,
        paragraphs: [
          "Salut,",
          "Tu étais à deux doigts de débloquer Anyloc, ce serait dommage de t'arrêter là.",
          "Change ta position sur Snap, Insta, Tinder et tes jeux en quelques secondes. Plus de 10 000 utilisateurs, noté 4,6/5 sur Trustpilot.",
          "Ton compte est prêt, il ne manque plus que le paiement.",
        ],
        cta: "Finaliser mon accès",
      };

  const signature = "Une question ? Réponds simplement à ce mail, je lis tout.\n\nJean, fondateur d'Anyloc";
  const footer = "Tu reçois cet email parce que tu as créé un compte sur anyloc.io sans finaliser ton achat.";

  const text = [
    ...content.paragraphs,
    `${content.cta} : ${ctaUrl}`,
    signature,
    "—",
    footer,
    `Ne plus recevoir ces emails : ${unsubscribeUrl}`,
  ].join("\n\n");

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td>
${content.paragraphs
  .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${escapeHtml(p)}</p>`)
  .join("\n")}
<p style="margin:22px 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:8px">${escapeHtml(content.cta)}</a></p>
<p style="margin:0;font-size:15px;line-height:1.55">Une question ? Réponds simplement à ce mail, je lis tout.<br><br>Jean, fondateur d'Anyloc</p>
<p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa">${escapeHtml(footer)}<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#a1a1aa">Ne plus recevoir ces emails</a></p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  return { subject: content.subject, html, text };
}

