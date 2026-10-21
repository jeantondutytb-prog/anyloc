/**
 * A/B test of the one-take proof video below the plans: half of the visitors
 * see it, the other half see the checkout as before. Drawn on the first
 * checkout view and kept in a cookie. Read on checkout_continue_clicked and
 * purchase_completed, broken down by the proof_video_variant person property.
 */
export const PROOF_VIDEO_VARIANTS = ["control", "video"] as const;

export type ProofVideoVariant = (typeof PROOF_VIDEO_VARIANTS)[number];

export const PROOF_VIDEO_COOKIE = "anyloc-proof-video";

const PROOF_VIDEO_MAX_AGE = 60 * 60 * 24 * 90;

export function parseProofVideoVariant(value: unknown): ProofVideoVariant | null {
  return PROOF_VIDEO_VARIANTS.find((variant) => variant === value) ?? null;
}

/** This browser's variant, drawn and stored on the first call. */
export function getOrPickProofVideoVariant(random = Math.random()): ProofVideoVariant {
  const match = document.cookie.match(new RegExp(`(?:^|; )${PROOF_VIDEO_COOKIE}=([^;]*)`));
  const existing = parseProofVideoVariant(match?.[1]);
  if (existing) return existing;

  const variant: ProofVideoVariant = random < 0.5 ? "control" : "video";
  document.cookie = `${PROOF_VIDEO_COOKIE}=${variant}; path=/; max-age=${PROOF_VIDEO_MAX_AGE}; samesite=lax`;
  return variant;
}
