import type { User } from "@supabase/supabase-js";
import { after } from "next/server";
import { logError } from "@/lib/log-error";
import {
  buildRecoveryEmail,
  getDueRecoveryStep,
  getRecoveryOfferExpiry,
  isRecoveryOfferActive,
  isWelcomeOfferEnabled,
  RECOVERY_COUPON_ID,
  RECOVERY_OFFER_PLAN_ID,
  signUnsubscribeToken,
  type RecoveryState,
  type RecoveryStep,
} from "@/lib/checkout-recovery";
import {
  buildEmailOfferEmail,
  getEmailOffer,
  isEmailOfferActive,
  planEmailOffer,
} from "@/lib/checkout-email-offer";
import { cancelScheduledEmail, isResendConfigured, sendEmail } from "@/lib/email/resend";
import { capturePostHogEvent } from "@/lib/posthog/server";
import { getAppUrl, stripe } from "@/lib/stripe";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSubscriptionAccessForUser } from "@/lib/subscription";

type RecoveryRow = {
  user_id: string;
  email: string;
  plan_id: string;
  first_checkout_at: string;
  steps_sent: number;
  offer_expires_at: string | null;
  converted_at: string | null;
  unsubscribed_at: string | null;
};

const ROW_COLUMNS =
  "user_id, email, plan_id, first_checkout_at, steps_sent, offer_expires_at, converted_at, unsubscribed_at";

function toState(row: RecoveryRow): RecoveryState {
  return {
    firstCheckoutAt: new Date(row.first_checkout_at),
    stepsSent: row.steps_sent,
    offerExpiresAt: row.offer_expires_at ? new Date(row.offer_expires_at) : null,
    convertedAt: row.converted_at ? new Date(row.converted_at) : null,
    unsubscribedAt: row.unsubscribed_at ? new Date(row.unsubscribed_at) : null,
  };
}

/**
 * Starts the emails (and the welcome offer, while WELCOME_OFFER is on) the
 * first time a logged-in user sees the paywall (first_checkout_at is that
 * first view). Later views keep the first deadline.
 */
export async function enrollInCheckoutRecovery(user: User, planId: string) {
  if (!user.email || !isSupabaseAdminConfigured()) return;

  const now = new Date();
  const { data: inserted, error } = await createAdminClient()
    .from("checkout_recoveries")
    .upsert(
      {
        user_id: user.id,
        email: user.email,
        plan_id: planId,
        first_checkout_at: now.toISOString(),
        // Offers already started keep their deadline.
        offer_expires_at: isWelcomeOfferEnabled() ? getRecoveryOfferExpiry(now).toISOString() : null,
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    )
    // Only a first view comes back: later views hit the conflict and insert nothing.
    .select("user_id");

  if (error) {
    await logError("checkout-recovery/enroll", error, { userId: user.id, plan_id: planId });
    return;
  }

  // The welcome offer keeps its own 3-email sequence (cron); otherwise one email at 15 min.
  if (inserted?.length && !isWelcomeOfferEnabled()) {
    const email = user.email;
    // After the response: the paywall never waits on Resend.
    after(() =>
      scheduleEmailOffer(user.id, email, planId, now).catch((err) =>
        logError("checkout-recovery/schedule", err, { userId: user.id, plan_id: planId })
      )
    );
  }
}

function getUnsubscribeUrl(userId: string) {
  return `${getAppUrl()}/api/email/unsubscribe?u=${userId}&t=${signUnsubscribeToken(userId)}`;
}

/**
 * Queues the email at Resend for 15 min after the first paywall view, then
 * stores the arm and the 2 h window. The window is only stored once the email
 * is queued: no email, no discount.
 */
async function scheduleEmailOffer(userId: string, email: string, planId: string, firstViewAt: Date) {
  if (!isResendConfigured()) return;

  const schedule = planEmailOffer(userId, planId, firstViewAt);
  const unsubscribeUrl = getUnsubscribeUrl(userId);
  const message = buildEmailOfferEmail({
    planId,
    variant: schedule.variant,
    expiresAt: schedule.expiresAt,
    appUrl: getAppUrl(),
    unsubscribeUrl,
  });

  const { id } = await sendEmail({
    to: email,
    ...message,
    scheduledAt: schedule.sendAt,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    tags: [
      { name: "campaign", value: "checkout_recovery" },
      { name: "step", value: `mail15_${schedule.variant}` },
    ],
  });

  const { error } = await createAdminClient()
    .from("checkout_recoveries")
    .update({
      email_offer_variant: schedule.variant,
      email_offer_send_at: schedule.sendAt.toISOString(),
      email_offer_expires_at: schedule.expiresAt?.toISOString() ?? null,
      email_offer_email_id: id,
    })
    .eq("user_id", userId);

  if (error) {
    // Without the stored window the link would land on the full price: drop the email.
    await cancelScheduledEmail(id).catch(() => false);
    throw new Error(error.message);
  }

  await capturePostHogEvent({
    distinctId: userId,
    event: "recovery_email_scheduled",
    properties: {
      plan: planId,
      variant: schedule.variant,
      send_at: schedule.sendAt.toISOString(),
    },
  });
}

type EmailOfferRow = {
  email_offer_send_at: string | null;
  email_offer_expires_at: string | null;
  email_offer_email_id: string | null;
  converted_at: string | null;
};

async function getEmailOfferRow(userId: string) {
  const { data, error } = await createAdminClient()
    .from("checkout_recoveries")
    .select("email_offer_send_at, email_offer_expires_at, email_offer_email_id, converted_at")
    .eq("user_id", userId)
    .maybeSingle<EmailOfferRow>();
  return error ? null : data;
}

function isEmailOfferRowActive(row: EmailOfferRow, now: Date) {
  const date = (value: string | null) => (value ? new Date(value) : null);
  return isEmailOfferActive(
    {
      sendAt: date(row.email_offer_send_at),
      expiresAt: date(row.email_offer_expires_at),
      convertedAt: date(row.converted_at),
    },
    now
  );
}

/** End (ISO) of the 15-min email's discount while it runs, else null: what the paywall shows. */
export async function getActiveEmailOfferEnd(userId: string) {
  if (!isSupabaseAdminConfigured()) return null;

  const row = await getEmailOfferRow(userId);
  return row && isEmailOfferRowActive(row, new Date()) ? row.email_offer_expires_at : null;
}

const ensuredCoupons = new Set<string>();

/** The offer's coupons are created on first use, so no setup step is needed in Stripe. */
async function ensureEmailOfferCoupon(planId: string) {
  const offer = getEmailOffer(planId);
  if (!offer || !stripe) return null;
  if (ensuredCoupons.has(offer.couponId)) return offer.couponId;

  try {
    await stripe.coupons.retrieve(offer.couponId);
  } catch (error) {
    if ((error as { code?: string }).code !== "resource_missing") throw error;
    await stripe.coupons
      .create({
        id: offer.couponId,
        amount_off: offer.amountOffCents,
        currency: "eur",
        duration: "once",
        // Shown to the customer next to the discount in Stripe Checkout.
        name: "Offre spéciale",
      })
      .catch((err: { code?: string }) => {
        // Created by a concurrent request meanwhile.
        if (err.code !== "resource_already_exists") throw err;
      });
  }
  ensuredCoupons.add(offer.couponId);
  return offer.couponId;
}

/**
 * Paid: stops the recovery and cancels the 15-min email if it has not gone out.
 * Safe to call on every payment.
 */
export async function markCheckoutRecoveryConverted(userId: string) {
  if (!isSupabaseAdminConfigured()) return;

  const now = new Date();
  const { data, error } = await createAdminClient()
    .from("checkout_recoveries")
    .update({ converted_at: now.toISOString() })
    .eq("user_id", userId)
    .is("converted_at", null)
    .select("email_offer_send_at, email_offer_email_id")
    .returns<{ email_offer_send_at: string | null; email_offer_email_id: string | null }[]>();

  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (
    row?.email_offer_email_id &&
    row.email_offer_send_at &&
    new Date(row.email_offer_send_at) > now &&
    isResendConfigured()
  ) {
    await cancelScheduledEmail(row.email_offer_email_id);
  }
}

/** When this user's welcome offer ends, or null once it is over (or never started). */
export async function getActiveRecoveryOfferExpiry(userId: string) {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await createAdminClient()
    .from("checkout_recoveries")
    .select(ROW_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle<RecoveryRow>();

  if (error || !data) return null;
  const state = toState(data);
  return isRecoveryOfferActive(state, new Date()) ? state.offerExpiresAt : null;
}

/**
 * Coupon to apply to this user's checkout: the welcome offer on the monthly
 * plan, else the 15-min email's discount on the plan picked, while it runs.
 */
export async function getRecoveryCouponForUser(userId: string, planId: string) {
  if (planId === RECOVERY_OFFER_PLAN_ID && (await getActiveRecoveryOfferExpiry(userId))) {
    return RECOVERY_COUPON_ID;
  }
  if (!getEmailOffer(planId) || !isSupabaseAdminConfigured()) return null;

  const row = await getEmailOfferRow(userId);
  if (!row || !isEmailOfferRowActive(row, new Date())) return null;
  return ensureEmailOfferCoupon(planId);
}

export async function unsubscribeFromCheckoutRecovery(userId: string) {
  const { error } = await createAdminClient()
    .from("checkout_recoveries")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("unsubscribed_at", null);

  if (error) throw new Error(error.message);
}

async function sendRecoveryStep(row: RecoveryRow, step: RecoveryStep) {
  const admin = createAdminClient();
  const state = toState(row);
  const offerExpiresAt = isRecoveryOfferActive(state, new Date()) ? state.offerExpiresAt : null;

  // Claim the step first: a concurrent run matching the old steps_sent updates nothing.
  const { data: claimed, error: claimError } = await admin
    .from("checkout_recoveries")
    .update({ steps_sent: step, last_sent_at: new Date().toISOString() })
    .eq("user_id", row.user_id)
    .eq("steps_sent", row.steps_sent)
    .select("user_id");

  if (claimError) throw new Error(claimError.message);
  if (!claimed?.length) return false;

  const appUrl = getAppUrl();
  const unsubscribeUrl = getUnsubscribeUrl(row.user_id);
  const email = buildRecoveryEmail({
    step,
    appUrl,
    planId: row.plan_id,
    offerExpiresAt,
    unsubscribeUrl,
  });

  try {
    await sendEmail({
      to: row.email,
      ...email,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [
        { name: "campaign", value: "checkout_recovery" },
        { name: "step", value: String(step) },
      ],
    });
  } catch (error) {
    // Release the claim so the next run retries this step.
    await admin
      .from("checkout_recoveries")
      .update({ steps_sent: row.steps_sent })
      .eq("user_id", row.user_id);
    throw error;
  }

  await capturePostHogEvent({
    distinctId: row.user_id,
    event: "recovery_email_sent",
    properties: { step, plan: row.plan_id, offer: offerExpiresAt !== null },
  });
  return true;
}

/**
 * Waves, not bursts: Resend allows a few requests per second, and a fresh
 * sending domain that blasts hundreds of emails at once lands in spam.
 */
const MAX_SENDS_PER_RUN = 150;
const SEND_SPACING_MS = 600;

export type RecoveryRunResult = {
  checked: number;
  sent: number;
  converted: number;
  failed: number;
};

/**
 * Sends every due email of the welcome offer's sequence; run hourly. Without
 * the welcome offer, the single 15-min email is queued at Resend instead.
 */
export async function processCheckoutRecoveries(now = new Date()): Promise<RecoveryRunResult> {
  const result: RecoveryRunResult = { checked: 0, sent: 0, converted: 0, failed: 0 };
  if (!isWelcomeOfferEnabled()) return result;
  if (!isSupabaseAdminConfigured() || !isResendConfigured()) return result;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("checkout_recoveries")
    .select(ROW_COLUMNS)
    .is("converted_at", null)
    .is("unsubscribed_at", null)
    .lt("steps_sent", 3)
    .gte("first_checkout_at", new Date(now.getTime() - 8 * 24 * 3600 * 1000).toISOString())
    .order("first_checkout_at", { ascending: true })
    .limit(500)
    .returns<RecoveryRow[]>();

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    if (result.sent >= MAX_SENDS_PER_RUN) break;
    const step = getDueRecoveryStep(toState(row), now);
    if (!step) continue;
    result.checked += 1;

    // Paid since the last run (webhook already updated the profile): stop here.
    const access = await getSubscriptionAccessForUser(row.user_id, row.email);
    if (access.hasAccess) {
      await admin
        .from("checkout_recoveries")
        .update({ converted_at: now.toISOString() })
        .eq("user_id", row.user_id);
      result.converted += 1;
      continue;
    }

    try {
      if (await sendRecoveryStep(row, step)) {
        result.sent += 1;
        await new Promise((resolve) => setTimeout(resolve, SEND_SPACING_MS));
      }
    } catch (err) {
      result.failed += 1;
      await logError("checkout-recovery/send", err, { userId: row.user_id, step });
    }
  }

  return result;
}

/** Test helper: sends a given step now to an enrolled user, whatever the schedule. */
export async function forceRecoveryStep(email: string, step: RecoveryStep) {
  const { data, error } = await createAdminClient()
    .from("checkout_recoveries")
    .select(ROW_COLUMNS)
    .ilike("email", email)
    .maybeSingle<RecoveryRow>();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("No recovery row for this email: open /checkout with it first.");

  return sendRecoveryStep({ ...data, steps_sent: Math.min(data.steps_sent, step - 1) }, step);
}

const NO_SALE_ALERT_KEY = "no_sale_4h";
const NO_SALE_WINDOW_MS = 4 * 3600 * 1000;
/** Stripe sessions in the window (one visitor opens several); below this, silence is normal. */
const NO_SALE_MIN_CHECKOUTS = 30;

export const OPS_ALERT_EMAIL = process.env.OPS_ALERT_EMAIL ?? "jean@anyloc.io";

/** Emails an alert when checkouts keep coming but nothing sold for 4 h. At most once per 4 h. */
export async function checkNoSaleAlert(now = new Date()) {
  if (!stripe || !isSupabaseAdminConfigured() || !isResendConfigured()) {
    return { alerted: false, reason: "not_configured" as const };
  }

  const since = Math.floor((now.getTime() - NO_SALE_WINDOW_MS) / 1000);
  const sessions = await stripe.checkout.sessions.list({ created: { gte: since }, limit: 100 });
  const checkouts = sessions.data.length;
  const paid = sessions.data.filter((s) => s.payment_status === "paid").length;

  const lastSale = await stripe.charges
    .list({ limit: 20 })
    .then((charges) => charges.data.find((charge) => charge.status === "succeeded"));
  const lastSaleAt = lastSale ? new Date(lastSale.created * 1000) : null;
  const saleInWindow = lastSaleAt !== null && now.getTime() - lastSaleAt.getTime() < NO_SALE_WINDOW_MS;

  if (paid > 0 || saleInWindow || checkouts < NO_SALE_MIN_CHECKOUTS) {
    return { alerted: false, checkouts, paid, reason: "ok" as const };
  }

  const admin = createAdminClient();
  const { data: lastAlert } = await admin
    .from("ops_alerts")
    .select("last_sent_at")
    .eq("key", NO_SALE_ALERT_KEY)
    .maybeSingle<{ last_sent_at: string }>();

  if (lastAlert && now.getTime() - new Date(lastAlert.last_sent_at).getTime() < NO_SALE_WINDOW_MS) {
    return { alerted: false, checkouts, paid, reason: "throttled" as const };
  }

  const lastSaleLabel = lastSaleAt
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Europe/Paris",
      }).format(lastSaleAt)
    : "aucune";
  const lines = [
    `${checkouts} paiements ouverts sur Stripe ces 4 dernières heures, 0 payé.`,
    `Dernière vente : ${lastSaleLabel}.`,
    "À vérifier : le checkout charge-t-il (PostHog checkout_error) ? Un déploiement récent a-t-il changé le paywall ?",
  ];

  await sendEmail({
    to: OPS_ALERT_EMAIL,
    subject: `⚠️ Anyloc : 0 vente en 4 h (${checkouts} checkouts)`,
    text: lines.join("\n\n"),
    html: lines.map((line) => `<p>${line}</p>`).join(""),
    tags: [{ name: "campaign", value: "ops_alert" }],
  });

  await admin
    .from("ops_alerts")
    .upsert({ key: NO_SALE_ALERT_KEY, last_sent_at: now.toISOString() });

  await capturePostHogEvent({
    distinctId: "ops",
    event: "ops_no_sale_alert",
    properties: { checkouts, last_sale_at: lastSaleAt?.toISOString() ?? null },
  });

  return { alerted: true, checkouts, paid, reason: "alerted" as const };
}
