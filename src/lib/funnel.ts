import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export type FunnelEvent =
  | "checkout_page_viewed"
  | "checkout_started"
  | "purchase_completed";

export async function logFunnelEvent(
  event: FunnelEvent,
  details: {
    planId?: string | null;
    email?: string | null;
    stripeSessionId?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
) {
  if (!isSupabaseAdminConfigured()) {
    return;
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("funnel_events").insert({
      event,
      plan_id: details.planId ?? null,
      email: details.email ?? null,
      stripe_session_id: details.stripeSessionId ?? null,
      metadata: details.metadata ?? null,
    });

    if (error) {
      console.error("[funnel] Failed to log event:", event, error);
    }
  } catch (error) {
    console.error("[funnel] Failed to log event:", event, error);
  }
}
