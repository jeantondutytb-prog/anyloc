import * as amplitude from "@amplitude/unified";

export function isAmplitudeBrowserReady() {
  return typeof window !== "undefined" && amplitude.getSessionId() !== undefined;
}

export function initAmplitudeBrowser() {
  if (typeof window === "undefined") {
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

  if (!apiKey) {
    return;
  }

  if (isAmplitudeBrowserReady()) {
    return;
  }

  try {
    amplitude.initAll(apiKey, {
      analytics: { autocapture: true },
      sessionReplay: { sampleRate: 1 },
    });
  } catch (error) {
    console.error("[amplitude] Failed to initialize", error);
  }
}
