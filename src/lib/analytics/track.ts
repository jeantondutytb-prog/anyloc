import { trackAmplitudeEvent } from "@/lib/amplitude/browser";
import { capturePostHogClientEvent } from "@/lib/posthog/browser";

export type TrackProperties = Record<string, unknown>;

/**
 * Single entry point for product events in the browser: sends the event to
 * PostHog and Amplitude so funnels can be built in either tool.
 * Never pass PII (email, password, address) in properties.
 */
export function track(event: string, properties?: TrackProperties) {
  if (typeof window === "undefined") {
    return;
  }

  const props = { path: window.location.pathname, ...properties };

  if (process.env.NODE_ENV === "development") {
    console.debug("[track]", event, props);
  }

  capturePostHogClientEvent(event, props);
  trackAmplitudeEvent(event, props);
}

/**
 * Reads `data-track-*` attributes of an element into event properties:
 * `data-track-location="hero"` becomes `{ location: "hero" }`.
 */
export function readTrackAttributes(element: HTMLElement): TrackProperties {
  const props: TrackProperties = {};

  for (const [key, value] of Object.entries(element.dataset)) {
    if (key.startsWith("track") && key !== "track" && value !== undefined) {
      const name = key.slice("track".length);
      props[name.charAt(0).toLowerCase() + name.slice(1)] = value;
    }
  }

  return props;
}
