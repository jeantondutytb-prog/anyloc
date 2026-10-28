"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { openCrispChat } from "@/components/crisp/crisp-loader";

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
 * Shows or hides our chat bubble. Crisp's own bubble always stays hidden: on
 * iPhone (Safari and Chrome) it cut every fast scroll after about a screen.
 * Crisp itself stays loaded, so visitors still show up live in the Crisp app.
 */
export function setCrispBubbleHidden(hidden: boolean) {
  if (typeof window === "undefined") return;
  window.$crisp = window.$crisp ?? [];
  window.$crisp.push(["do", "chat:hide"]);
  window.dispatchEvent(new CustomEvent<boolean>(BUBBLE_EVENT, { detail: hidden }));
}

/**
 * Draws a look-alike of Crisp's bubble that opens the real chat, hidden on
 * the pages listed above.
 */
export function CrispVisibility() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(true);
  const [opened, setOpened] = useState(false);
  const hiddenRef = useRef(hidden);

  useEffect(() => {
    hiddenRef.current = hidden;
  }, [hidden]);

  useEffect(() => {
    window.$crisp = window.$crisp ?? [];
    window.$crisp.push([
      "on",
      "chat:closed",
      () => {
        window.$crisp?.push(["do", "chat:hide"]);
        setOpened(false);
      },
    ]);
    // With Crisp's bubble hidden, an operator's message would go unseen:
    // open the chat on it, as Crisp does with its own bubble (not on the
    // pages where the bubble stays hidden).
    window.$crisp.push([
      "on",
      "message:received",
      () => {
        if (hiddenRef.current) return;
        setOpened(true);
        openCrispChat();
      },
    ]);

    function onBubble(event: Event) {
      setHidden((event as CustomEvent<boolean>).detail);
    }
    window.addEventListener(BUBBLE_EVENT, onBubble);
    return () => window.removeEventListener(BUBBLE_EVENT, onBubble);
  }, []);

  useEffect(() => {
    setCrispBubbleHidden(isCrispHiddenPath(pathname));
  }, [pathname]);

  if (hidden || opened) return null;

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
