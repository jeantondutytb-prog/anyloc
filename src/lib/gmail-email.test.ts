import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalEmail, gmailVariantsPattern, isGmailAddress } from "./gmail-email";

// PostgREST `imatch` is Postgres `~*`; JS RegExp with the "i" flag behaves the
// same for this pattern (plain chars, escaped dots, one optional group).
function matches(pattern: string, email: string) {
  return new RegExp(pattern, "i").test(email);
}

describe("canonicalEmail", () => {
  it("drops dots in a Gmail address", () => {
    assert.equal(canonicalEmail("jean.dupont@gmail.com"), "jeandupont@gmail.com");
    assert.equal(canonicalEmail("j.e.a.n.dupont@gmail.com"), "jeandupont@gmail.com");
  });

  it("drops the +suffix", () => {
    assert.equal(canonicalEmail("jeandupont+anyloc@gmail.com"), "jeandupont@gmail.com");
    assert.equal(canonicalEmail("jean.dupont+a.b@gmail.com"), "jeandupont@gmail.com");
  });

  it("treats googlemail.com as gmail.com", () => {
    assert.equal(canonicalEmail("Jean.Dupont@GoogleMail.com"), "jeandupont@gmail.com");
  });

  it("only trims and lowercases other providers", () => {
    assert.equal(canonicalEmail("  Jean.Dupont+x@Outlook.fr "), "jean.dupont+x@outlook.fr");
    assert.equal(canonicalEmail("jean.dupont@gmail.fr"), "jean.dupont@gmail.fr");
  });
});

describe("isGmailAddress", () => {
  it("recognises gmail and googlemail only", () => {
    assert.equal(isGmailAddress("a@gmail.com"), true);
    assert.equal(isGmailAddress("a@googlemail.com"), true);
    assert.equal(isGmailAddress("a@outlook.fr"), false);
    assert.equal(isGmailAddress("a@notgmail.com"), false);
    assert.equal(isGmailAddress("not-an-email"), false);
  });
});

describe("gmailVariantsPattern", () => {
  const pattern = gmailVariantsPattern("jeandupont@gmail.com")!;

  it("matches every spelling of the same inbox", () => {
    for (const email of [
      "jeandupont@gmail.com",
      "jean.dupont@gmail.com",
      "J.E.A.N.Dupont@Gmail.com",
      "jeandupont+anyloc@gmail.com",
      "jean.dupont+x.y@googlemail.com",
    ]) {
      assert.ok(matches(pattern, email), email);
    }
  });

  it("does not match a different inbox", () => {
    for (const email of [
      "jeandupont2@gmail.com",
      "jeandupon@gmail.com",
      "xjeandupont@gmail.com",
      "jeandupont@gmail.fr",
      "jeandupont@outlook.com",
      "jeandupont@gmailxcom",
    ]) {
      assert.ok(!matches(pattern, email), email);
    }
  });

  it("is the same whichever variant is typed", () => {
    assert.equal(gmailVariantsPattern("Jean.Dupont+x@googlemail.com"), pattern);
  });

  it("escapes regex characters in the local part", () => {
    const odd = gmailVariantsPattern("a-b_c@gmail.com")!;
    assert.ok(matches(odd, "a-b_c@gmail.com"));
    assert.ok(!matches(odd, "aXb_c@gmail.com"));
  });

  it("is null for other providers", () => {
    assert.equal(gmailVariantsPattern("jean.dupont@outlook.fr"), null);
  });
});
