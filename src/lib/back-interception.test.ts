import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldReplayBack } from "./back-interception";

describe("shouldReplayBack", () => {
  it("replays the back press when no offer was made", () => {
    assert.equal(shouldReplayBack("declined"), true);
  });

  it("stays on the page when an offer is shown", () => {
    assert.equal(shouldReplayBack("shown"), false);
  });

  it("stays on the page when the flow was aborted (payment popup opened)", () => {
    assert.equal(shouldReplayBack("aborted"), false);
    assert.equal(shouldReplayBack(undefined), false);
  });
});
