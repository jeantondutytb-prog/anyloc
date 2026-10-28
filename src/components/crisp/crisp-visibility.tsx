"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { openCrispChat } from "@/components/crisp/crisp-loader";
import { isThirdPartyOff } from "@/lib/third-party-off";

/** Pages where the chat bubble covers the content (the onboarding phone). */
const HIDDEN_PATH_PREFIXES = ["/onboarding"];
/** The iPhone remote: the bubble sits on the "Définir cette position" button. */
const HIDDEN_PATHS = ["/app"];

const BUBBLE_EVENT = "anyloc:crisp-bubble-hidden";

export function isCrispHiddenPath(pathname: string | null) {
  if (pathname && HIDDEN_PATHS.includes(pathname)) return true;
  return HIDDEN_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
}

/**
 * Test for the iPhone scroll stall (`?off=crispbubble`): Crisp stays loaded
 * but its bubble is hidden, and a look-alike opens the chat instead.
 */
function usesOwnBubble() {
  return isThirdPartyOff("crispbubble");
}

/**
 * Hides or shows the Crisp bubble. `$crisp` is a command queue, so this works
 * even before Crisp's script has loaded.
 */
export function setCrispBubbleHidden(hidden: boolean) {
  if (typeof window === "undefined") return;
  window.$crisp = window.$crisp ?? [];
  window.$crisp.push(["do", hidden || usesOwnBubble() ? "chat:hide" : "chat:show"]);
  window.dispatchEvent(new CustomEvent<boolean>(BUBBLE_EVENT, { detail: hidden }));
}

/** Keeps the bubble hidden on the pages listed above, visible elsewhere. */
export function CrispVisibility() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(true);
  const [opened, setOpened] = useState(false);
  // Same first render on server and client: `hidden` starts true either way.
  const [ownBubble] = useState(usesOwnBubble);

  useEffect(() => {
    if (!ownBubble) return;
    window.$crisp = window.$crisp ?? [];
    window.$crisp.push([
      "on",
      "chat:closed",
      () => {
        window.$crisp?.push(["do", "chat:hide"]);
        setOpened(false);
      },
    ]);

    function onBubble(event: Event) {
      setHidden((event as CustomEvent<boolean>).detail);
    }
    window.addEventListener(BUBBLE_EVENT, onBubble);
    return () => window.removeEventListener(BUBBLE_EVENT, onBubble);
  }, [ownBubble]);

  useEffect(() => {
    setCrispBubbleHidden(isCrispHiddenPath(pathname));
  }, [pathname, ownBubble]);

  if (!ownBubble || hidden || opened) return null;

  return (
    <button
      type="button"
      aria-label="Ouvrir le chat"
      data-track="chat_bubble_clicked"
      onClick={() => {
        setOpened(true);
        openCrispChat();
      }}
      className="fixed right-[14px] bottom-[14px] z-[1000001] flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[rgb(181,32,207)] text-white shadow-[0_4px_10px_rgba(0,0,0,0.05)] transition-transform active:scale-95 sm:right-6 sm:bottom-6 sm:h-[60px] sm:w-[60px]"
    >
      <MessageCircle className="h-7 w-7" fill="currentColor" strokeWidth={0} />
    </button>
  );
}
