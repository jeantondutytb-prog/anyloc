import posthog from "posthog-js";

export function isPostHogBrowserReady() {
  return typeof window !== "undefined" && posthog.__loaded;
}

export function initPostHogBrowser() {
  if (typeof window === "undefined") {
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!apiKey || posthog.__loaded) {
    return;
  }

  try {
    posthog.init(apiKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      ui_host: "https://eu.posthog.com",
      defaults: "2026-05-30",
      capture_pageview: false,
      capture_pageleave: true,
      capture_exceptions: true,
      person_profiles: "identified_only",
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
      },
    });
  } catch (error) {
    console.error("[posthog] Failed to initialize", error);
  }
}

export function capturePostHogClientEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  initPostHogBrowser();

  if (!isPostHogBrowserReady()) {
    return;
  }

  posthog.capture(event, properties);
}
