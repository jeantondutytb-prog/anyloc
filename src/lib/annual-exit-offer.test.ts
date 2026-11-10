import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANNUAL_EXIT_OFFER_WINDOW_MS,
  formatAnnualExitExpiry,
  getAnnualExitOfferExpiry,
  getAnnualExitOfferPlanId,
  getAnnualExitOfferState,
  parseAnnualExitOfferVariant,
  resolveAnnualExitOfferStart,
  pickAnnualExitOfferVariant,
} from "./annual-exit-offer";

describe("annual exit offer", () => {
  const start = new Date("2026-11-10T18:00:00Z");
  const at = (ms: number) => new Date(start.getTime() + ms);

  it("offers the annual plan of the v1 grid only", () => {
    assert.equal(getAnnualExitOfferPlanId("monthly"), "annual");
    assert.equal(getAnnualExitOfferPlanId("6months"), "annual");
    assert.equal(getAnnualExitOfferPlanId("annual"), "annual");
    assert.equal(getAnnualExitOfferPlanId("month_v2"), null);
    assert.equal(getAnnualExitOfferPlanId("year_v2"), null);
  });

  it("stays open 2 hours from the first display, then expires", () => {
    const base = { hasPastSubscription: false };
    assert.equal(getAnnualExitOfferState({ ...base, startedAt: null, now: start }), "available");
    assert.equal(getAnnualExitOfferState({ ...base, startedAt: start, now: at(60 * 60_000) }), "available");
    assert.equal(getAnnualExitOfferState({ ...base, startedAt: start, now: at(ANNUAL_EXIT_OFFER_WINDOW_MS) }), "expired");
    assert.deepEqual(getAnnualExitOfferExpiry(start), at(ANNUAL_EXIT_OFFER_WINDOW_MS));
  });

  it("never goes to a former subscriber", () => {
    assert.equal(
      getAnnualExitOfferState({ startedAt: null, hasPastSubscription: true, now: start }),
      "not_eligible"
    );
  });

  it("splits visitors in half", () => {
    assert.equal(pickAnnualExitOfferVariant(0.2), "control");
    assert.equal(pickAnnualExitOfferVariant(0.7), "offer");
    assert.equal(parseAnnualExitOfferVariant("nope"), null);
  });

  it("keeps the first start time on a second display", () => {
    assert.deepEqual(resolveAnnualExitOfferStart(start, at(30 * 60_000)), start);
    assert.deepEqual(resolveAnnualExitOfferStart(null, at(30 * 60_000)), at(30 * 60_000));
  });
});

describe("formatAnnualExitExpiry", () => {
  it("formats HH:MM in local time with zero padding", () => {
    assert.equal(formatAnnualExitExpiry(new Date(2026, 0, 1, 9, 5)), "09:05");
    assert.equal(formatAnnualExitExpiry(new Date(2026, 0, 1, 23, 40)), "23:40");
  });
});
