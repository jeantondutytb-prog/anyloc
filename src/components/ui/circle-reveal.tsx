"use client";

import { createPortal } from "react-dom";
import { motion } from "framer-motion";

export const CIRCLE_REVEAL_MS = 420;

export type CircleRevealOrigin = { x: number; y: number };

/** Radius that covers the whole viewport from `origin`. */
function coverRadius({ x, y }: CircleRevealOrigin) {
  return Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
}

/**
 * Full-screen color that grows as a circle from `origin` until it covers the
 * page. Used to switch between the light site and the dark onboarding app
 * (landing → app, and app → signup) without a hard cut. Callers navigate at
 * ~75% of CIRCLE_REVEAL_MS; the overlay stays mounted until the old page
 * unmounts, so the new page appears on the same color.
 */
export function CircleReveal({
  origin,
  color,
}: {
  origin: CircleRevealOrigin;
  color: string;
}) {
  const { x, y } = origin;

  return createPortal(
    <motion.div
      aria-hidden
      className="pointer-events-auto fixed inset-0 z-[9999]"
      style={{ background: color }}
      initial={{ clipPath: `circle(0px at ${x}px ${y}px)` }}
      animate={{ clipPath: `circle(${coverRadius(origin)}px at ${x}px ${y}px)` }}
      transition={{ duration: CIRCLE_REVEAL_MS / 1000, ease: [0.65, 0, 0.35, 1] }}
    />,
    document.body
  );
}
