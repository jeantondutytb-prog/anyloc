import { initPostHogBrowser } from "@/lib/posthog/browser";

try {
  initPostHogBrowser();
} catch (error) {
  console.error("[posthog] Failed to initialize", error);
}
