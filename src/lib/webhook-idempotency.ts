import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

const UNIQUE_VIOLATION = "23505";

/**
 * Reserves the event before handling it, so two concurrent deliveries of the
 * same event (Stripe retries) can't both run the handler. Returns false when
 * another delivery already holds it.
 */
export async function claimStripeEvent(eventId: string, eventType: string) {
  if (!isSupabaseAdminConfigured()) {
    return true;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("stripe_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  });

  if (!error) {
    return true;
  }

  if (error.code === UNIQUE_VIOLATION) {
    return false;
  }

  // Can't reach the table: better to risk a duplicate than to drop the event.
  console.error("[stripe-webhook] Failed to claim event:", error);
  return true;
}

/** Frees a claim whose handler failed, so Stripe's retry runs it again. */
export async function releaseStripeEvent(eventId: string) {
  if (!isSupabaseAdminConfigured()) {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("stripe_webhook_events")
    .delete()
    .eq("event_id", eventId);

  if (error) {
    console.error("[stripe-webhook] Failed to release event:", error);
  }
}
