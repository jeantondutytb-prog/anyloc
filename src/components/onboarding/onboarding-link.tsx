"use client";

import { useEffect, useState, type ComponentProps, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CIRCLE_REVEAL_MS,
  CircleReveal,
  type CircleRevealOrigin,
} from "@/components/ui/circle-reveal";

// The onboarding map opens on Paris at zoom 12 (see onboarding-app-map.tsx).
const START = { lat: 48.8566, lng: 2.3522, zoom: 12 };

function startTiles() {
  const n = 2 ** START.zoom;
  const x = Math.floor(((START.lng + 180) / 360) * n);
  const rad = (START.lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  const tiles: [number, number][] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      tiles.push([x + dx, y + dy]);
    }
  }
  return tiles;
}

let warmedUp = false;

/** Loads the onboarding map code and first tiles so the app shows up ready. */
function warmUpOnboarding() {
  if (warmedUp || typeof window === "undefined") {
    return;
  }
  warmedUp = true;
  void import("@/components/onboarding/onboarding-app-map");
  for (const [x, y] of startTiles()) {
    for (const layer of ["World_Dark_Gray_Base", "World_Dark_Gray_Reference"]) {
      const img = new Image();
      img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${layer}/MapServer/tile/${START.zoom}/${y}/${x}`;
    }
  }
}

type Reveal = { origin: CircleRevealOrigin; color: string };

/**
 * Link to the onboarding sandbox that covers the page with an expanding
 * circle (the app's dark background on mobile) before navigating, so the
 * dark app doesn't cut in abruptly after the light landing page.
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
    // Mobile shows the app full screen (dark); desktop frames it on the page background.
    const color = window.matchMedia("(min-width: 640px)").matches
      ? "var(--background)"
      : "#0A0A0C";

    setReveal({ origin, color });
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
