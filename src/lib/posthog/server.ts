import { PostHog } from "posthog-node";

let client: PostHog | null = null;

export function getPostHogServerClient(): PostHog | null {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!apiKey) {
    return null;
  }

  if (!client) {
    client = new PostHog(apiKey, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return client;
}

export async function capturePostHogEvent(params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}) {
  const posthog = getPostHogServerClient();

  if (!posthog) {
    return;
  }

  posthog.capture({
    distinctId: params.distinctId,
    event: params.event,
    properties: params.properties,
  });

  await posthog.flush();
}
