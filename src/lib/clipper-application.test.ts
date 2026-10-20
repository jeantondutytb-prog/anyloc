import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLIPPER_WHATSAPP_NUMBER,
  clipperWhatsAppUrl,
  normalizePhone,
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

describe("normalizePhone", () => {
  it("reads French numbers typed the local way", () => {
    assert.equal(normalizePhone("06 12 34 56 78"), "+33612345678");
    assert.equal(normalizePhone("07.12.34.56.78"), "+33712345678");
    assert.equal(normalizePhone("0033612345678"), "+33612345678");
  });

  it("keeps international numbers", () => {
    assert.equal(normalizePhone("+32 470 12 34 56"), "+32470123456");
  });

  it("rejects things that aren't phone numbers", () => {
    assert.equal(normalizePhone("123"), null);
    assert.equal(normalizePhone("pas de numéro"), null);
  });
});

describe("parseClipperApplication", () => {
  it("requires the phone", () => {
    const result = parseClipperApplication(form({ videosPerDay: "1", firstName: "Léa" }));
    assert.equal(result.ok, false);
  });

  it("rejects a malformed phone", () => {
    const result = parseClipperApplication(
      form({ videosPerDay: "1", firstName: "Léa", phone: "123" })
    );
    assert.equal(result.ok, false);
  });

  it("keeps the utm campaign of the link", () => {
    const result = parseClipperApplication(
      form({
        videosPerDay: "1",
        firstName: "Léa",
        phone: "06 12 34 56 78",
        utmCampaign: "clippeurs_mail3",
      })
    );
    assert.equal(result.ok && result.application.utmCampaign, "clippeurs_mail3");
  });

  it("returns a normalized application", () => {
    const result = parseClipperApplication(
      form({ videosPerDay: "2-3", firstName: " Léa ", phone: "06 12 34 56 78" })
    );
    assert.deepEqual(result, {
      ok: true,
      application: {
        firstName: "Léa",
        videosPerDay: "2-3",
        phone: "+33612345678",
        utmCampaign: null,
      },
    });
  });
});

describe("clipperWhatsAppUrl", () => {
  it("pré-remplit un message qui dit qui écrit et pourquoi", () => {
    const url = new URL(
      clipperWhatsAppUrl({ firstName: " Léa ", videosPerDay: "2-3" })
    );
    assert.equal(url.origin + url.pathname, `https://wa.me/${CLIPPER_WHATSAPP_NUMBER}`);
    const text = url.searchParams.get("text") ?? "";
    assert.match(text, /C'est Léa\./);
    assert.doesNotMatch(text, /\p{Extended_Pictographic}/u);
    assert.match(text, /clippeur Anyloc/);
    assert.match(text, /2 à 3 vidéos par jour/);
  });
});
