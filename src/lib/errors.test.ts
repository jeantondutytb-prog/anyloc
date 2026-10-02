import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicErrorMessage, UserFacingError } from "./errors";
import { escapeLikePattern } from "./guest-account";

describe("publicErrorMessage", () => {
  it("shows messages written for the customer", () => {
    assert.equal(publicErrorMessage(new UserFacingError("Profil introuvable."), "x"), "Profil introuvable.");
  });

  it("hides raw provider errors", () => {
    assert.equal(publicErrorMessage(new Error("No such customer: cus_123"), "Oups"), "Oups");
    assert.equal(publicErrorMessage("boom", "Oups"), "Oups");
  });
});

describe("escapeLikePattern", () => {
  it("escapes ILIKE wildcards that are legal in emails", () => {
    assert.equal(escapeLikePattern("a_b%c@x.io"), "a\\_b\\%c@x.io");
  });
});
