"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import {
  initPostHogBrowser,
  isPostHogBrowserReady,
} from "@/lib/posthog/browser";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

initPostHogBrowser();

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHogBrowser();

    if (!pathname || !isPostHogBrowserReady()) return;

    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname, searchParams]);

  return null;
}

function PostHogIdentify() {
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      initPostHogBrowser();

      if (!isPostHogBrowserReady()) {
        return;
      }

      if (
        session?.user &&
        (event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "USER_UPDATED")
      ) {
        posthog.identify(session.user.id, {
          email: session.user.email,
        });
        return;
      }

      if (event === "SIGNED_OUT") {
        posthog.reset();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

export function PostHogProvider() {
  return (
    <Suspense fallback={null}>
      <PostHogIdentify />
      <PostHogPageview />
    </Suspense>
  );
}
