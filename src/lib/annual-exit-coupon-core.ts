/** The gate of the annual exit offer in the checkout routes. No Stripe or Supabase here. */

export type AnnualExitCouponResult =
  | { kind: "none" }
  | { kind: "coupon"; couponId: string }
  | { kind: "error"; status: 401 | 409; error: string };

export type AnnualExitCouponDeps = {
  isEnabled: () => boolean;
  getCoupon: (userId: string, planId: string, now?: Date) => Promise<string | null>;
};

/**
 * The offer is checked here, never trusted from the browser: a request that
 * does not ask for it gets `none`; a guest gets 401; a flag that is off, an
 * expired window or an ineligible user gets 409.
 */
export async function resolveAnnualExitCouponWith(
  input: { requested: boolean; userId: string | null; planId: string; now?: Date },
  deps: AnnualExitCouponDeps
): Promise<AnnualExitCouponResult> {
  if (!input.requested) return { kind: "none" };
  if (!input.userId) return { kind: "error", status: 401, error: "Connexion requise." };

  const couponId = deps.isEnabled() ? await deps.getCoupon(input.userId, input.planId, input.now) : null;
  if (!couponId) return { kind: "error", status: 409, error: "Cette offre a expiré." };
  return { kind: "coupon", couponId };
}
