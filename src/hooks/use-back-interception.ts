"use client";

import { useEffect, useRef } from "react";

/**
 * Intercepts the first browser back press of a visit: when `enabled` turns
 * true, one history entry is pushed; the first `popstate` then calls `onBack`
 * (the visitor stays on the page) and the hook is disarmed for the rest of the
 * visit, so the next back press leaves normally.
 * If `onBack` resolves `false` (nothing was shown), or the press happens while
 * disabled, the back press is replayed so it is never swallowed.
 * The pushed entry keeps Next's own history state, so its router isn't confused.
 */
export function useBackInterception(
  enabled: boolean,
  onBack: () => Promise<boolean> | boolean | void
) {
  const onBackRef = useRef(onBack);
  const enabledRef = useRef(enabled);
  const pushedRef = useRef(false);
  const disarmedRef = useRef(false);

  useEffect(() => {
    onBackRef.current = onBack;
    enabledRef.current = enabled;
  });

  useEffect(() => {
    if (!enabled || pushedRef.current || disarmedRef.current) return;
    window.history.pushState(window.history.state, "");
    pushedRef.current = true;
  }, [enabled]);

  useEffect(() => {
    function handlePopState() {
      if (!pushedRef.current || disarmedRef.current) return;
      // Our entry is gone either way.
      pushedRef.current = false;
      if (!enabledRef.current) {
        // Disabled (payment popup open...): don't swallow the press.
        disarmedRef.current = true;
        window.history.back();
        return;
      }
      disarmedRef.current = true;
      void Promise.resolve(onBackRef.current()).then((shown) => {
        if (shown === false) window.history.back();
      });
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
}
