"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Pages where the chat bubble covers the content (the onboarding phone). */
const HIDDEN_PATH_PREFIXES = ["/onboarding"];

export function isCrispHiddenPath(pathname: string | null) {
  return HIDDEN_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
}

/**
 * Hides or shows the Crisp bubble. `$crisp` is a command queue, so this works
 * even before Crisp's script has loaded.
 */
export function setCrispBubbleHidden(hidden: boolean) {
  if (typeof window === "undefined") return;
  window.$crisp = window.$crisp ?? [];
  window.$crisp.push(["do", hidden ? "chat:hide" : "chat:show"]);
}

/** Keeps the bubble hidden on the pages listed above, visible elsewhere. */
export function CrispVisibility() {
  const pathname = usePathname();

  useEffect(() => {
    setCrispBubbleHidden(isCrispHiddenPath(pathname));
  }, [pathname]);

  return null;
}
