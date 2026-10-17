import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIRST_MONTH_OFFER_WINDOW_MS,
  getFirstMonthOfferPrice,
  getFirstMonthOfferReason,
  isDeclineOfferCode,
} from "./checkout-first-month-offer";

const createdAt = new Date("2026-10-17T18:00:00Z");
const later = (ms: number) => new Date(createdAt.getTime() + ms);

describe("isDeclineOfferCode", () => {
  it("only rescues an empty account", () => {
    assert.equal(isDeclineOfferCode("insufficient_funds"), true);
    assert.equal(isDeclineOfferCode("highest_risk_level"), false);
    assert.equal(isDeclineOfferCode(undefined), false);
  });
});

describe("getFirstMonthOfferReason", () => {
  const declined = { declineCode: "insufficient_funds", planId: "annual", createdAt };
  const closed = { planId: "annual", createdAt };

  it("offers the shortest plan of the refused plan's grid", () => {
    assert.equal(getFirstMonthOfferReason(declined, "monthly", null, later(60_000)), "declined");
    assert.equal(
      getFirstMonthOfferReason({ ...declined, planId: "year_v2" }, "month_v2", null, later(0)),
      "declined"
    );
  });

  it("refuses another plan or another grid", () => {
    assert.equal(getFirstMonthOfferReason(declined, "annual", null, later(0)), null);
    assert.equal(getFirstMonthOfferReason(declined, "month_v2", null, later(0)), null);
  });

  it("refuses a checkout that wasn't refused for lack of funds", () => {
    assert.equal(
      getFirstMonthOfferReason({ ...declined, declineCode: "highest_risk_level" }, "monthly", null, later(0)),
      null
    );
  });

  it("offers a closed checkout only to the offer group", () => {
    assert.equal(getFirstMonthOfferReason(closed, "monthly", "offer", later(0)), "closed");
    assert.equal(getFirstMonthOfferReason(closed, "monthly", "control", later(0)), null);
    assert.equal(getFirstMonthOfferReason(closed, "monthly", null, later(0)), null);
  });

  it("expires after the window", () => {
    const tooLate = later(FIRST_MONTH_OFFER_WINDOW_MS + 1);
    assert.equal(getFirstMonthOfferReason(declined, "monthly", null, tooLate), null);
    assert.equal(getFirstMonthOfferReason(closed, "monthly", "offer", tooLate), null);
  });
});

describe("getFirstMonthOfferPrice", () => {
  it("halves the plan price", () => {
    assert.equal(getFirstMonthOfferPrice("9,90€"), "4,95 €");
    assert.equal(getFirstMonthOfferPrice("19€"), "9,50 €");
  });
});
