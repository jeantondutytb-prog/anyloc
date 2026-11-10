import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAnnualExitCouponWith } from "./annual-exit-coupon-core";

describe("resolveAnnualExitCouponWith", () => {
  const deps = (enabled: boolean, coupon: string | null) => ({
    isEnabled: () => enabled,
    getCoupon: async () => coupon,
  });

  it("does nothing when the offer was not requested", async () => {
    const result = await resolveAnnualExitCouponWith(
      { requested: false, userId: null, planId: "annual" },
      deps(true, "cpn")
    );
    assert.deepEqual(result, { kind: "none" });
  });

  it("refuses a guest with 401", async () => {
    const result = await resolveAnnualExitCouponWith(
      { requested: true, userId: null, planId: "annual" },
      deps(true, "cpn")
    );
    assert.deepEqual(result, { kind: "error", status: 401, error: "Connexion requise." });
  });

  it("refuses with 409 when the flag is off", async () => {
    const result = await resolveAnnualExitCouponWith(
      { requested: true, userId: "u1", planId: "annual" },
      deps(false, "cpn")
    );
    assert.deepEqual(result, { kind: "error", status: 409, error: "Cette offre a expiré." });
  });

  it("refuses with 409 when expired or not eligible", async () => {
    const result = await resolveAnnualExitCouponWith(
      { requested: true, userId: "u1", planId: "annual" },
      deps(true, null)
    );
    assert.deepEqual(result, { kind: "error", status: 409, error: "Cette offre a expiré." });
  });

  it("returns the coupon when the offer is open", async () => {
    const result = await resolveAnnualExitCouponWith(
      { requested: true, userId: "u1", planId: "annual" },
      deps(true, "cpn")
    );
    assert.deepEqual(result, { kind: "coupon", couponId: "cpn" });
  });
});
