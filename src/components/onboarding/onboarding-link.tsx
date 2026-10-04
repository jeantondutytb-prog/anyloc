"use client";

import { useEffect, useState, type ComponentProps, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CIRCLE_REVEAL_MS,
  CircleReveal,
  type CircleRevealOrigin,
} from "@/components/ui/circle-reveal";

let warmedUp = false;

/** Loads the onboarding map code ahead of the click, so step 2 shows up ready. */
function warmUpOnboarding() {
  if (warmedUp || typeof window === "undefined") {
    return;
  }
  warmedUp = true;
  void import("@/components/onboarding/onboarding-aha-map");
}

type Reveal = { origin: CircleRevealOrigin; color: string };

/**
 * Link to the onboarding that covers the page with an expanding circle
 * before navigating, so the onboarding doesn't cut in abruptly.
 */
export function OnboardingLink({
  href,
  onClick,
  children,
  ...props
}: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter();
  const [reveal, setReveal] = useState<Reveal | null>(null);

  useEffect(() => {
    router.prefetch(href);
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 1500));
    idle(() => warmUpOnboarding());
  }, [router, href]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    warmUpOnboarding();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const origin = {
      x: event.clientX || rect.left + rect.width / 2,
      y: event.clientY || rect.top + rect.height / 2,
    };
    // The onboarding is on the light page background.
    setReveal({ origin, color: "var(--background)" });
    // Navigate once the circle mostly covers the page; the old page stays
    // mounted (and the overlay with it) until the onboarding page is ready.
    window.setTimeout(() => router.push(href), CIRCLE_REVEAL_MS * 0.75);
  }

  return (
    <>
      <Link
        href={href}
        onClick={handleClick}
        onPointerEnter={warmUpOnboarding}
        onTouchStart={warmUpOnboarding}
        {...props}
      >
        {children}
      </Link>
      {reveal && <CircleReveal origin={reveal.origin} color={reveal.color} />}
    </>
  );
}
