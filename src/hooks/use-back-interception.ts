"use client";

import { useEffect, useRef } from "react";

/**
 * Intercepts the first browser back press of a visit: when `enabled` turns
 * true, one history entry is pushed; the first `popstate` then calls `onBack`
 * (the visitor stays on the page) and the hook is disarmed for the rest of the
 * visit, so the next back press leaves normally.
 * The pushed entry keeps Next's own history state, so its router isn't confused.
 */
export function useBackInterception(enabled: boolean, onBack: () => void) {
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
      if (!enabledRef.current) return;
      disarmedRef.current = true;
      onBackRef.current();
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
}
