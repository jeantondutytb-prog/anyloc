"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { ErrorFallback } from "@/components/error-fallback";
import { initPostHogBrowser } from "@/lib/posthog/browser";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    initPostHogBrowser();
    posthog.captureException(error);
  }, [error]);

  return <ErrorFallback reset={reset} />;
}
