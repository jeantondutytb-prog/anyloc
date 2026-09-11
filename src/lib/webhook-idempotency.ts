import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

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
    console.error("[stripe-webhook] Failed to read event idempotency:", error);
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
    console.error("[stripe-webhook] Failed to store event idempotency:", error);
  }
}
