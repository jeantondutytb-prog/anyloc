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
  it("reads French mobile numbers typed the local way", () => {
    assert.equal(normalizePhone("06 48 27 93 15"), "+33648279315");
    assert.equal(normalizePhone("07.81.52.94.36"), "+33781529436");
    assert.equal(normalizePhone("0033648279315"), "+33648279315");
    assert.equal(normalizePhone("+33 6 48 27 93 15"), "+33648279315");
  });

  it("keeps foreign mobile numbers", () => {
    assert.equal(normalizePhone("+32 470 81 52 94"), "+32470815294");
    assert.equal(normalizePhone("+44 7400 582 913"), "+447400582913");
  });

  it("rejects numbers that can't be texted back", () => {
    assert.equal(normalizePhone("04 78 52 91 36"), null, "landline");
    assert.equal(normalizePhone("08 92 52 91 36"), null, "service number");
    assert.equal(normalizePhone("07 12 52 91 36"), null, "unallocated 07");
  });

  it("rejects the numbers typed to get past the form", () => {
    assert.equal(normalizePhone("06 12 34 56 78"), null);
    assert.equal(normalizePhone("06 66 66 66 66"), null);
    assert.equal(normalizePhone("07 98 76 54 32"), null);
  });

  it("rejects things that aren't phone numbers", () => {
    assert.equal(normalizePhone("123"), null);
    assert.equal(normalizePhone("pas de numéro"), null);
    assert.equal(normalizePhone(""), null);
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
        phone: "06 48 27 93 15",
        utmCampaign: "clippeurs_mail3",
      })
    );
    assert.equal(result.ok && result.application.utmCampaign, "clippeurs_mail3");
  });

  it("returns a normalized application", () => {
    const result = parseClipperApplication(
      form({ videosPerDay: "2-3", firstName: " Léa ", phone: "06 48 27 93 15" })
    );
    assert.deepEqual(result, {
      ok: true,
      application: {
        firstName: "Léa",
        videosPerDay: "2-3",
        phone: "+33648279315",
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
