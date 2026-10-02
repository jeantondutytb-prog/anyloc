import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeInstagramHandle,
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

describe("parseClipperApplication", () => {
  it("returns a normalized application", () => {
    const result = parseClipperApplication(
      form({ videosPerDay: "2-3", firstName: " Léa ", instagram: "@Lea.Clips" })
    );
    assert.deepEqual(result, {
      ok: true,
      application: { firstName: "Léa", instagram: "lea.clips", videosPerDay: "2-3" },
    });
  });

  it("rejects an unknown videos-per-day value", () => {
    const result = parseClipperApplication(
      form({ videosPerDay: "100", firstName: "Léa", instagram: "lea" })
    );
    assert.equal(result.ok, false);
  });
});
