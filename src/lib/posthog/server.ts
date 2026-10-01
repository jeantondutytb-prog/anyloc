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

async function flushPostHog(posthog: PostHog) {
  await posthog.flush();
}

export async function identifyPostHogUser(params: {
  distinctId: string;
  properties?: Record<string, unknown>;
}) {
  const posthog = getPostHogServerClient();

  if (!posthog) {
    return;
  }

  posthog.identify({
    distinctId: params.distinctId,
    properties: params.properties,
  });

  await flushPostHog(posthog);
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

  await flushPostHog(posthog);
}

/**
 * Merges an anonymous browser id into a known user, so the visit that led to a
 * purchase made without being logged in is attributed to that user.
 */
export async function aliasPostHogUser(params: {
  distinctId: string;
  alias: string;
}) {
  const posthog = getPostHogServerClient();

  if (!posthog || params.alias === params.distinctId) {
    return;
  }

  posthog.alias({ distinctId: params.distinctId, alias: params.alias });

  await flushPostHog(posthog);
}

/** Accepts only ids shaped like PostHog's (uuid / user id), never arbitrary input. */
export function parsePostHogDistinctId(value: unknown): string | undefined {
  return typeof value === "string" && /^[\w.:@$-]{1,200}$/.test(value)
    ? value
    : undefined;
}

export async function capturePostHogException(params: {
  distinctId: string;
  error: unknown;
  properties?: Record<string, unknown>;
}) {
  const posthog = getPostHogServerClient();

  if (!posthog) {
    return;
  }

  const error =
    params.error instanceof Error
      ? params.error
      : new Error(String(params.error));

  posthog.captureException(error, params.distinctId, params.properties);

  await flushPostHog(posthog);
}
