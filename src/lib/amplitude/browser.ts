import {
  Identify,
  getSessionId,
  initAll,
  identify,
  reset,
  setUserId,
} from "@amplitude/unified";

let initPromise: Promise<void> | null = null;

export function isAmplitudeBrowserReady() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return getSessionId() !== undefined;
  } catch {
    return false;
  }
}

export async function initAmplitudeBrowser() {
  if (typeof window === "undefined") {
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

  if (!apiKey || isAmplitudeBrowserReady()) {
    return;
  }

  if (!initPromise) {
    initPromise = initAll(apiKey, {
      analytics: { autocapture: true },
      sessionReplay: { sampleRate: 1 },
    }).catch((error) => {
      initPromise = null;
      console.error("[amplitude] Failed to initialize", error);
    });
  }

  await initPromise;
}

export async function identifyAmplitudeUser(userId: string, email?: string | null) {
  try {
    await initAmplitudeBrowser();
    if (!isAmplitudeBrowserReady()) {
      return;
    }

    setUserId(userId);
    if (email) {
      identify(new Identify().set("email", email));
    }
  } catch (error) {
    console.error("[amplitude] Failed to identify user", error);
  }
}

export function resetAmplitudeUser() {
  try {
    if (isAmplitudeBrowserReady()) {
      reset();
    }
  } catch (error) {
    console.error("[amplitude] Failed to reset user", error);
  }
}
