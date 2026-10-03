import type { User } from "@supabase/supabase-js";
import {
  buildRecoveryEmail,
  getDueRecoveryStep,
  getRecoveryOfferExpiry,
  isRecoveryOfferActive,
  RECOVERY_COUPON_ID,
  RECOVERY_OFFER_PLAN_ID,
  signUnsubscribeToken,
  type RecoveryState,
  type RecoveryStep,
} from "@/lib/checkout-recovery";
import { isResendConfigured, sendEmail } from "@/lib/email/resend";
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

/** Starts the sequence the first time a logged-in user opens the payment form. */
export async function enrollInCheckoutRecovery(user: User, planId: string) {
  if (!user.email || !isSupabaseAdminConfigured()) return;

  const { error } = await createAdminClient()
    .from("checkout_recoveries")
    .upsert(
      { user_id: user.id, email: user.email, plan_id: planId },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

  if (error) {
    console.error("[checkout-recovery] enroll failed:", error.message);
  }
}

/** Coupon to apply to this user's checkout, when the email offer is live and the plan is eligible. */
export async function getRecoveryCouponForUser(userId: string, planId: string) {
  if (planId !== RECOVERY_OFFER_PLAN_ID || !isSupabaseAdminConfigured()) return null;

  const { data, error } = await createAdminClient()
    .from("checkout_recoveries")
    .select(ROW_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle<RecoveryRow>();

  if (error || !data) return null;
  return isRecoveryOfferActive(toState(data), new Date()) ? RECOVERY_COUPON_ID : null;
}

export async function hasActiveRecoveryOffer(userId: string) {
  return (await getRecoveryCouponForUser(userId, RECOVERY_OFFER_PLAN_ID)) !== null;
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
  const offerExpiresAt =
    step >= 2 ? state.offerExpiresAt ?? getRecoveryOfferExpiry(state.firstCheckoutAt) : null;

  // Claim the step first: a concurrent run matching the old steps_sent updates nothing.
  const { data: claimed, error: claimError } = await admin
    .from("checkout_recoveries")
    .update({
      steps_sent: step,
      last_sent_at: new Date().toISOString(),
      ...(offerExpiresAt ? { offer_expires_at: offerExpiresAt.toISOString() } : {}),
    })
    .eq("user_id", row.user_id)
    .eq("steps_sent", row.steps_sent)
    .select("user_id");

  if (claimError) throw new Error(claimError.message);
  if (!claimed?.length) return false;

  const appUrl = getAppUrl();
  const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?u=${row.user_id}&t=${signUnsubscribeToken(row.user_id)}`;
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
      .update({ steps_sent: row.steps_sent, offer_expires_at: row.offer_expires_at })
      .eq("user_id", row.user_id);
    throw error;
  }

  await capturePostHogEvent({
    distinctId: row.user_id,
    event: "recovery_email_sent",
    properties: { step, plan: row.plan_id, offer: step >= 2 },
  });
  return true;
}

export type RecoveryRunResult = {
  checked: number;
  sent: number;
  converted: number;
  failed: number;
};

/** Sends every due recovery email; run hourly. */
export async function processCheckoutRecoveries(now = new Date()): Promise<RecoveryRunResult> {
  const result: RecoveryRunResult = { checked: 0, sent: 0, converted: 0, failed: 0 };
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
      if (await sendRecoveryStep(row, step)) result.sent += 1;
    } catch (err) {
      result.failed += 1;
      console.error("[checkout-recovery] send failed:", row.user_id, err);
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
