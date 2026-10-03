import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeInstagramHandle,
  normalizeUtmCampaign,
  parseClipperApplication,
} from "./clipper-application";

function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.append(name, value);
  }
  return formData;
}

describe("normalizeInstagramHandle", () => {
  it("accepts a handle with or without @", () => {
    assert.equal(normalizeInstagramHandle("@Lea.Clips"), "lea.clips");
    assert.equal(normalizeInstagramHandle("lea_clips"), "lea_clips");
  });

  it("extracts the handle from a profile link", () => {
    assert.equal(
      normalizeInstagramHandle("https://www.instagram.com/lea.clips/?hl=fr"),
      "lea.clips"
    );
  });

  it("rejects invalid handles", () => {
    assert.equal(normalizeInstagramHandle(""), null);
    assert.equal(normalizeInstagramHandle("pas un pseudo"), null);
  });
});

describe("normalizeUtmCampaign", () => {
  it("keeps a clean campaign name", () => {
    assert.equal(normalizeUtmCampaign(" Clippeurs_Mail3 "), "clippeurs_mail3");
  });

  it("drops missing or suspicious values", () => {
    assert.equal(normalizeUtmCampaign(undefined), null);
    assert.equal(normalizeUtmCampaign(""), null);
    assert.equal(normalizeUtmCampaign("<script>"), null);
  });
});

describe("parseClipperApplication", () => {
  it("keeps the utm campaign of the link", () => {
    const result = parseClipperApplication(
      form({
        videosPerDay: "1",
        firstName: "Léa",
        instagram: "lea",
        utmCampaign: "clippeurs_mail3",
      })
    );
    assert.equal(result.ok && result.application.utmCampaign, "clippeurs_mail3");
  });

  it("returns a normalized application", () => {
    const result = parseClipperApplication(
      form({ videosPerDay: "2-3", firstName: " Léa ", instagram: "@Lea.Clips" })
    );
    assert.deepEqual(result, {
      ok: true,
      application: {
        firstName: "Léa",
        instagram: "lea.clips",
        videosPerDay: "2-3",
        utmCampaign: null,
      },
    });
  });

  it("rejects an unknown videos-per-day value", () => {
    const result = parseClipperApplication(
      form({ videosPerDay: "100", firstName: "Léa", instagram: "lea" })
    );
    assert.equal(result.ok, false);
  });
});
