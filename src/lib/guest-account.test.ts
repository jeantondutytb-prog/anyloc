import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeLikePattern, normalizeEmail } from "./guest-account";

describe("escapeLikePattern", () => {
  it("keeps plain emails unchanged", () => {
    assert.equal(escapeLikePattern("jean@gmail.com"), "jean@gmail.com");
  });

  it("escapes LIKE wildcards so they match literally", () => {
    assert.equal(escapeLikePattern("a_b%c@x.io"), "a\\_b\\%c@x.io");
    assert.equal(escapeLikePattern("a\\b@x.io"), "a\\\\b@x.io");
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    assert.equal(normalizeEmail("  Jean@Gmail.COM "), "jean@gmail.com");
  });
});
