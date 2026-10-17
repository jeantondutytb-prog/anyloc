"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Whether this browser already holds a login session. Read from the session
 * cookie (no network call), after hydration: the page renders the visitor
 * version first, then swaps. Lets marketing pages send returning customers
 * straight to their dashboard instead of the onboarding.
 */
export function useHasSession() {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }
    let cancelled = false;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) setHasSession(Boolean(data.session));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return hasSession;
}
