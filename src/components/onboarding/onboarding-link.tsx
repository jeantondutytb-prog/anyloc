"use client";

import { useEffect, useState, type ComponentProps, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

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

type Reveal = { x: number; y: number; radius: number; color: string };

const REVEAL_DURATION_MS = 420;

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
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    // Mobile shows the app full screen (dark); desktop frames it on the page background.
    const color = window.matchMedia("(min-width: 640px)").matches
      ? "var(--background)"
      : "#0A0A0C";

    setReveal({ x, y, radius, color });
    // Navigate once the circle mostly covers the page; the old page stays
    // mounted (and the overlay with it) until the onboarding page is ready.
    window.setTimeout(() => router.push(href), REVEAL_DURATION_MS * 0.75);
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
      {reveal &&
        createPortal(
          <motion.div
            aria-hidden
            className="pointer-events-auto fixed inset-0 z-[9999]"
            style={{ background: reveal.color }}
            initial={{ clipPath: `circle(0px at ${reveal.x}px ${reveal.y}px)` }}
            animate={{ clipPath: `circle(${reveal.radius}px at ${reveal.x}px ${reveal.y}px)` }}
            transition={{ duration: REVEAL_DURATION_MS / 1000, ease: [0.65, 0, 0.35, 1] }}
          />,
          document.body
        )}
    </>
  );
}
