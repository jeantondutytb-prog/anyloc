"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/track";
import { CHECKOUT_COPY } from "@/lib/checkout-copy";
import { getOrPickProofVideoVariant } from "@/lib/checkout-proof-video";
import { registerPostHogProperties } from "@/lib/posthog/browser";

const VIDEO_SRC = "/proof/demo-snap-londres-paris.mp4";
const POSTER_SRC = "/proof/demo-snap-londres-paris.jpg";

/**
 * One-take screen recording (Anyloc → Snap Map, London then Paris), sped up
 * ×3 without cuts. Half of mobile visitors scroll below the plans looking for
 * reassurance, so the proof sits there, behind a 50/50 A/B test. Mount it only
 * once hydrated: the variant comes from a cookie.
 */
export function CheckoutProofVideo() {
  const copy = CHECKOUT_COPY;
  const [variant] = useState(getOrPickProofVideoVariant);
  const slotRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    registerPostHogProperties({ proof_video_variant: variant });
  }, [variant]);

  // Both variants count as exposed once the spot is on screen, so the test
  // compares visitors who scrolled that far, with or without the video.
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    let exposed = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
          if (!exposed) {
            exposed = true;
            track("proof_video_experiment_exposed", {
              proof_video_variant: variant,
              $set: { proof_video_variant: variant },
            });
          }
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(slot);
    return () => observer.disconnect();
  }, [variant]);

  if (variant === "control") return <div ref={slotRef} aria-hidden className="h-px" />;

  return (
    <section
      ref={slotRef}
      className="mt-8 flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-3"
    >
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        muted
        loop
        playsInline
        preload="none"
        aria-label={copy.proofVideoAlt}
        className="aspect-[886/1920] w-32 shrink-0 rounded-xl bg-zinc-100 object-cover sm:w-36"
      />
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold leading-tight text-zinc-900">{copy.proofVideoTitle}</h2>
        <ol className="mt-2 space-y-1.5 text-[13.5px] leading-snug text-zinc-600">
          {copy.proofVideoSteps.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-50 text-[11px] font-bold text-pink-600">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-2.5 text-[11px] font-medium text-zinc-500">{copy.proofVideoCaption}</p>
      </div>
    </section>
  );
}
