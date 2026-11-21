import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACQUISITION_TIKTOK_ACCOUNTS, shuffleAccounts } from "./acquisition-source";

describe("shuffleAccounts", () => {
  it("keeps every account exactly once", () => {
    const shuffled = shuffleAccounts();
    assert.equal(shuffled.length, ACQUISITION_TIKTOK_ACCOUNTS.length);
    assert.deepEqual([...shuffled].sort(), [...ACQUISITION_TIKTOK_ACCOUNTS].sort());
  });

  it("changes the order with the random draw", () => {
    assert.deepEqual(shuffleAccounts(() => 0.999), [...ACQUISITION_TIKTOK_ACCOUNTS]);
    assert.notDeepEqual(shuffleAccounts(() => 0), [...ACQUISITION_TIKTOK_ACCOUNTS]);
  });

  it("does not touch the shared list", () => {
    shuffleAccounts(() => 0);
    assert.equal(ACQUISITION_TIKTOK_ACCOUNTS[0], "kyliantropa");
  });
});
