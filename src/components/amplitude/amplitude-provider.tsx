"use client";

import { useEffect } from "react";
import * as amplitude from "@amplitude/unified";
import {
  initAmplitudeBrowser,
  isAmplitudeBrowserReady,
} from "@/lib/amplitude/browser";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

initAmplitudeBrowser();

function AmplitudeIdentify() {
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      initAmplitudeBrowser();

      if (!isAmplitudeBrowserReady()) {
        return;
      }

      if (
        session?.user &&
        (event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "USER_UPDATED")
      ) {
        amplitude.setUserId(session.user.id);
        if (session.user.email) {
          const identify = new amplitude.Identify().set(
            "email",
            session.user.email
          );
          amplitude.identify(identify);
        }
        return;
      }

      if (event === "SIGNED_OUT") {
        amplitude.reset();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

export function AmplitudeProvider() {
  return <AmplitudeIdentify />;
}
