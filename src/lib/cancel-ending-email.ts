import type Stripe from "stripe";

/** Set on the subscription when the customer schedules a cancellation. */
export const CANCEL_SCHEDULED_KEY = "cancel_scheduled";
export const CANCEL_ENDING_EMAIL_SENT_KEY = "cancel_ending_email_sent";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The daily run emails subscriptions ending 2 to 4 days from now: ~3 days
 * ahead, with a margin so a missed or late run doesn't skip anyone.
 */
export const CANCEL_ENDING_WINDOW = { minMs: 2 * DAY_MS, maxMs: 4 * DAY_MS };

type EndingSubscription = Pick<
  Stripe.Subscription,
  "status" | "cancel_at" | "cancel_at_period_end" | "metadata"
> & { items: { data: Array<Pick<Stripe.SubscriptionItem, "current_period_end">> } };

/** Unix time when a scheduled cancellation ends access, if any. */
export function getCancellationEndUnix(subscription: EndingSubscription) {
  return (
    subscription.cancel_at ??
    (subscription.cancel_at_period_end
      ? subscription.items.data[0]?.current_period_end ?? null
      : null)
  );
}

/** Pure rule, kept apart from Stripe so it can be tested. */
export function shouldSendCancelEndingEmail(subscription: EndingSubscription, now: Date) {
  const endsAt = getCancellationEndUnix(subscription);

  if (
    subscription.status !== "active" ||
    !endsAt ||
    subscription.metadata?.[CANCEL_ENDING_EMAIL_SENT_KEY] === "true"
  ) {
    return false;
  }

  const msLeft = endsAt * 1000 - now.getTime();
  return msLeft >= CANCEL_ENDING_WINDOW.minMs && msLeft <= CANCEL_ENDING_WINDOW.maxMs;
}

export function markCancelEndingEmailSent(metadata: Stripe.Metadata): Stripe.MetadataParam {
  return { ...metadata, [CANCEL_ENDING_EMAIL_SENT_KEY]: "true" };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCancelEndingEmail({ appUrl, endsAt }: { appUrl: string; endsAt: Date }) {
  const endDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(endsAt);
  const ctaUrl =
    `${appUrl}/dashboard/settings` +
    "?utm_source=email&utm_medium=email&utm_campaign=cancel_ending";
  const cta = "Garder mon accès";

  const subject = `Ton accès Anyloc se termine ${endDate}`;
  const paragraphs = [
    "Salut,",
    `Tu as résilié ton abonnement : ton accès Anyloc se termine ${endDate}. Après, tu ne pourras plus changer ta localisation sur Snap, Insta et tes autres apps.`,
    "Si tu as changé d'avis, tu peux garder ton accès en 1 clic depuis tes paramètres, sans rien ressaisir : ton abonnement reprend simplement comme avant.",
    "Et si quelque chose ne marchait pas, réponds à ce mail : on règle ça ensemble.",
  ];

  const text = [
    ...paragraphs,
    `${cta} : ${ctaUrl}`,
    "Jean, fondateur d'Anyloc",
  ].join("\n\n");

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
${paragraphs
  .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${escapeHtml(p)}</p>`)
  .join("\n")}
<p style="margin:24px 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:12px">${escapeHtml(cta)}</a></p>
<p style="margin:0;font-size:14px;line-height:1.5;color:#52525b">Jean, fondateur d'Anyloc</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  return { subject, html, text };
}
