"use client";

import { useEffect } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * The guest-checkout magic link is sent by the admin client, so Supabase
 * returns the session in the URL fragment (#access_token=…). The browser client
 * uses PKCE and ignores that fragment, and the protected dashboard bounces the
 * visitor here with it still attached: store the session ourselves, then go on.
 */
export function EmailLinkSession({ redirectTo }: { redirectTo: string }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      return;
    }

    // Never leave tokens in the address bar or history.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    if (!isSupabaseConfigured()) {
      return;
    }

    // Best effort: on failure the visitor still has the login form.
    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          console.error("[auth] Email link session failed:", error.message);
          return;
        }

        window.location.replace(redirectTo);
      })
      .catch((error: unknown) => {
        console.error("[auth] Email link session failed:", error);
      });
  }, [redirectTo]);

  return null;
}
