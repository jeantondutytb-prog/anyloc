import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { logError } from "@/lib/log-error";

export async function hasProcessedStripeEvent(eventId: string) {
  if (!isSupabaseAdminConfigured()) {
    return false;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    await logError("stripe-webhook/idempotency", error, { event_id: eventId, step: "read" });
    return false;
  }

  return Boolean(data);
}

export async function markStripeEventProcessed(
  eventId: string,
  eventType: string
) {
  if (!isSupabaseAdminConfigured()) {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("stripe_webhook_events").upsert(
    {
      event_id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString(),
    },
    { onConflict: "event_id" }
  );

  if (error) {
    await logError("stripe-webhook/idempotency", error, { event_id: eventId, step: "store" });
  }
}
