"use client";

import { useEffect } from "react";
import {
  identifyAmplitudeUser,
  initAmplitudeBrowser,
  resetAmplitudeUser,
} from "@/lib/amplitude/browser";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function AmplitudeIdentify() {
  useEffect(() => {
    void initAmplitudeBrowser();

    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.user &&
        (event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "USER_UPDATED")
      ) {
        void identifyAmplitudeUser(session.user.id, session.user.email);
        return;
      }

      if (event === "SIGNED_OUT") {
        resetAmplitudeUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

export function AmplitudeProvider() {
  return <AmplitudeIdentify />;
}
