import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeError } from "./log-error";

describe("normalizeError", () => {
  it("keeps real errors and their code", () => {
    const original = Object.assign(new Error("boom"), { code: "card_declined" });
    const { error, details } = normalizeError(original);
    assert.equal(error, original);
    assert.deepEqual(details, { error_code: "card_declined" });
  });

  it("turns Supabase error objects into a readable message", () => {
    const { error, details } = normalizeError({
      message: "duplicate key value",
      code: "23505",
      details: "Key (user_id) already exists.",
      hint: null,
    });
    assert.equal(error.message, "duplicate key value");
    assert.deepEqual(details, {
      error_code: "23505",
      error_details: "Key (user_id) already exists.",
    });
  });

  it("falls back to JSON for objects without a message", () => {
    assert.equal(normalizeError({ status: 500 }).error.message, '{"status":500}');
  });

  it("stringifies primitives", () => {
    assert.equal(normalizeError("nope").error.message, "nope");
  });
});
