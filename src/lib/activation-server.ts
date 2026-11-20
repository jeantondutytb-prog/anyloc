import {
  buildActivationHelpEmail,
  getActivationHelpSendAt,
  isActivationHelpEmailEnabled,
  type ActivationSource,
} from "@/lib/activation";
import {
  cancelScheduledEmail,
  EMAIL_REPLY_TO,
  isResendConfigured,
  sendEmail,
} from "@/lib/email/resend";
import { logError } from "@/lib/log-error";
import { capturePostHogEvent } from "@/lib/posthog/server";
import { getAppUrl } from "@/lib/stripe";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * Until the migration adds the columns, the update fails on an unknown column:
 * stay quiet then, or every location poll would log an error.
 */
function isMissingColumn(error: { code?: string } | null) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

/**
 * Records the customer's first successful position change, once: the event
 * `location_first_applied` goes to PostHog on the user, and the help email
 * still waiting at Resend is cancelled. Never throws.
 */
export async function markActivated(userId: string, source: ActivationSource) {
  if (!isSupabaseAdminConfigured()) return;

  try {
    const now = new Date().toISOString();
    // Only the first call matches (activated_at still empty): one event per customer.
    const { data, error } = await createAdminClient()
      .from("profiles")
      .update({ activated_at: now, activation_source: source })
      .eq("id", userId)
      .is("activated_at", null)
      .select("activation_help_email_id");

    if (error) {
      if (!isMissingColumn(error)) await logError("activation/mark", error, { userId, source });
      return;
    }
    if (!data?.length) return;

    await capturePostHogEvent({
      distinctId: userId,
      event: "location_first_applied",
      properties: { source, $set_once: { activated_at: now, activation_source: source } },
    });

    const emailId = (data[0] as { activation_help_email_id: string | null }).activation_help_email_id;
    if (emailId && (await cancelScheduledEmail(emailId).catch(() => false))) {
      await capturePostHogEvent({
        distinctId: userId,
        event: "activation_help_email_cancelled",
        properties: { source },
      });
    }
  } catch (error) {
    await logError("activation/mark", error, { userId, source });
  }
}

type ProfileRow = {
  email: string | null;
  activated_at: string | null;
  activation_help_email_id: string | null;
};

/**
 * After a purchase: queues the help email at Resend for 1 h later, cancelled
 * by markActivated if the position changes before. Off while
 * ACTIVATION_HELP_EMAIL is not "on". Never throws.
 */
export async function scheduleActivationHelpEmail(userId: string, purchasedAt = new Date()) {
  if (!isActivationHelpEmailEnabled() || !isResendConfigured() || !isSupabaseAdminConfigured()) {
    return;
  }

  try {
    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("email, activated_at, activation_help_email_id")
      .eq("id", userId)
      .maybeSingle<ProfileRow>();

    if (error) {
      if (!isMissingColumn(error)) await logError("activation/schedule", error, { userId });
      return;
    }
    // Already set up (returning customer) or already queued (webhook replay).
    if (!profile?.email || profile.activated_at || profile.activation_help_email_id) return;

    // The iPhone app changes the position on the phone without telling the
    // server: a customer who has it installed would get the email anyway.
    const { count } = await admin
      .from("ios_devices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "registered");
    if (count) return;

    // A late payment (e.g. SEPA) still gives the customer time to install.
    const sendAt = new Date(
      Math.max(getActivationHelpSendAt(purchasedAt).getTime(), Date.now() + 10 * 60 * 1000)
    );
    const message = buildActivationHelpEmail({ appUrl: getAppUrl() });
    const { id } = await sendEmail({
      to: profile.email,
      ...message,
      replyTo: EMAIL_REPLY_TO,
      scheduledAt: sendAt,
      tags: [{ name: "campaign", value: "activation_help" }],
    });

    const { data: stored, error: storeError } = await admin
      .from("profiles")
      .update({ activation_help_email_id: id })
      .eq("id", userId)
      .select("activated_at");

    const activatedMeanwhile = Boolean(
      (stored?.[0] as { activated_at: string | null } | undefined)?.activated_at
    );
    if (storeError || activatedMeanwhile) {
      // Not stored, nothing could cancel it later; or the position changed meanwhile.
      await cancelScheduledEmail(id).catch(() => false);
      if (storeError) await logError("activation/schedule", storeError, { userId });
      return;
    }

    await capturePostHogEvent({
      distinctId: userId,
      event: "activation_help_email_scheduled",
      properties: { send_at: sendAt.toISOString() },
    });
  } catch (error) {
    await logError("activation/schedule", error, { userId });
  }
}
