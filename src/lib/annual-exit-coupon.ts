import { isAnnualExitOfferEnabled } from "@/lib/annual-exit-offer";
import {
  type AnnualExitCouponDeps,
  type AnnualExitCouponResult,
  resolveAnnualExitCouponWith,
} from "@/lib/annual-exit-coupon-core";
import { getAnnualExitOfferCoupon } from "@/lib/annual-exit-offer-server";

export type { AnnualExitCouponResult };

/** Server wrapper of the gate, wired to the real flag and the real eligibility check. */
export function resolveAnnualExitCoupon(
  input: { requested: boolean; userId: string | null; planId: string; now?: Date },
  deps: AnnualExitCouponDeps = { isEnabled: isAnnualExitOfferEnabled, getCoupon: getAnnualExitOfferCoupon }
): Promise<AnnualExitCouponResult> {
  return resolveAnnualExitCouponWith(input, deps);
}
