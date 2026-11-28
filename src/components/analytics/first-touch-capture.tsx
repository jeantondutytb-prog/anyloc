"use client";

import { useEffect } from "react";
import {
  FIRST_TOUCH_COOKIE,
  FIRST_TOUCH_MAX_AGE_SECONDS,
  firstTouchFromVisit,
  serializeFirstTouch,
} from "@/lib/first-touch";

function hasCookie(name: string) {
  return document.cookie.split("; ").some((part) => part.startsWith(`${name}=`));
}

/**
 * Keeps the UTM tags and the sending site of the first tagged visit (see
 * lib/first-touch), so the checkout can put them on the purchase. Written
 * once: a later visit never replaces it.
 */
export function FirstTouchCapture() {
  useEffect(() => {
    try {
      if (hasCookie(FIRST_TOUCH_COOKIE)) return;

      const touch = firstTouchFromVisit(window.location.href, document.referrer);
      if (!touch) return;

      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie =
        `${FIRST_TOUCH_COOKIE}=${serializeFirstTouch(touch)}; Path=/; ` +
        `Max-Age=${FIRST_TOUCH_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
    } catch {
      // Cookies blocked: the purchase simply has no attribution.
    }
  }, []);

  return null;
}
