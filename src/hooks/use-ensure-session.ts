"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useEnsureSession() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function ensure() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        if (!cancelled) setReady(true);
        return;
      }

      const { error: signInError } = await supabase.auth.signInAnonymously();

      if (cancelled) return;

      if (signInError) {
        setError(signInError.message);
        return;
      }

      setReady(true);
    }

    void ensure();

    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
}
