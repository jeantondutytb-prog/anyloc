import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePostHogDistinctId } from "./server";

describe("parsePostHogDistinctId", () => {
  it("accepts PostHog anonymous ids and user ids", () => {
    assert.equal(
      parsePostHogDistinctId("01a0f662-e151-7cdc-acc2-112b2204c81f"),
      "01a0f662-e151-7cdc-acc2-112b2204c81f"
    );
    assert.equal(parsePostHogDistinctId("$device:abc123"), "$device:abc123");
  });

  it("rejects anything that is not a short id string", () => {
    assert.equal(parsePostHogDistinctId(undefined), undefined);
    assert.equal(parsePostHogDistinctId(42), undefined);
    assert.equal(parsePostHogDistinctId(""), undefined);
    assert.equal(parsePostHogDistinctId("a".repeat(201)), undefined);
    assert.equal(parsePostHogDistinctId("<script>alert(1)</script>"), undefined);
    assert.equal(parsePostHogDistinctId("id with spaces"), undefined);
  });
});
