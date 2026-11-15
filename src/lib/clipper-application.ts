// "mobile" metadata: only mobile numbers count as valid.
import { parsePhoneNumberFromString } from "libphonenumber-js/mobile";

export const CLIPPER_VIDEOS_PER_DAY = [
  { value: "1", label: "1 vidéo" },
  { value: "2-3", label: "2 à 3 vidéos" },
  { value: "4+", label: "4 ou plus" },
] as const;

export const CLIPPER_PHONE_ERROR =
  "Mets ton vrai numéro de portable (06 ou 07), c'est là qu'on te recontacte.";

export type ClipperVideosPerDay = (typeof CLIPPER_VIDEOS_PER_DAY)[number]["value"];

export type ClipperApplication = {
  firstName: string;
  videosPerDay: ClipperVideosPerDay;
  phone: string;
  utmCampaign: string | null;
};

export type ClipperApplicationResult =
  | { ok: true; application: ClipperApplication }
  | { ok: false; error: string };

const UTM_CAMPAIGN = /^[a-z0-9_-]{1,64}$/;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

// Les numéros qu'on tape pour passer le formulaire : 06 12 34 56 78, 06 66 66 66 66…
function looksFake(nationalNumber: string) {
  if (/(\d)\1{5}/.test(nationalNumber)) return true;
  const ascending = "0123456789012";
  const descending = "9876543210987";
  for (let start = 0; start + 6 <= nationalNumber.length; start += 1) {
    const run = nationalNumber.slice(start, start + 6);
    if (ascending.includes(run) || descending.includes(run)) return true;
  }
  return false;
}

// Met le numéro au format +33612345678, seulement si c'est un vrai portable
// (06, 07 attribué, ou un mobile étranger) : un fixe ou un faux numéro ne permet pas de recontacter.
// "06 12 34 56 78" est lu comme un numéro français.
export function normalizePhone(input: string) {
  const parsed = parsePhoneNumberFromString(input.trim(), "FR");
  if (!parsed?.isValid() || looksFake(parsed.nationalNumber)) {
    return null;
  }
  return parsed.number;
}

// Ton numéro WhatsApp, au format international sans "+" ni espaces (ex. "33612345678").
export const CLIPPER_WHATSAPP_NUMBER = "33643192953";

// Lien wa.me qui ouvre WhatsApp avec le message de candidature déjà écrit, adressé à Jean.
// Pas d'emoji : wa.me les abîme parfois en « � ».
export function clipperWhatsAppUrl({
  firstName,
  videosPerDay,
}: {
  firstName: string;
  videosPerDay: string;
}) {
  const videos: Record<string, string> = {
    "1": "1 vidéo",
    "2-3": "2 à 3 vidéos",
    "4+": "4 vidéos ou plus",
  };
  const lines = [
    `Salut Jean ! C'est ${firstName.trim()}.`,
    "Je viens de postuler pour devenir clippeur Anyloc.",
    videos[videosPerDay] ? `Je peux poster ${videos[videosPerDay]} par jour.` : null,
  ].filter(Boolean);

  return `https://wa.me/${CLIPPER_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

// Garde seulement un nom de campagne propre (ex. "clippeurs_mail3"), sinon null.
export function normalizeUtmCampaign(input: string | null | undefined) {
  const campaign = (input ?? "").trim().toLowerCase();
  return UTM_CAMPAIGN.test(campaign) ? campaign : null;
}

export function parseClipperApplication(
  formData: FormData
): ClipperApplicationResult {
  const videosPerDay = text(formData, "videosPerDay");
  const videosOption = CLIPPER_VIDEOS_PER_DAY.find((option) => option.value === videosPerDay);
  if (!videosOption) {
    return { ok: false, error: "Choisis combien de vidéos tu peux poster par jour." };
  }

  const firstName = text(formData, "firstName");
  if (!firstName) {
    return { ok: false, error: "Renseigne ton prénom." };
  }

  const phone = normalizePhone(text(formData, "phone"));
  if (!phone) {
    return { ok: false, error: CLIPPER_PHONE_ERROR };
  }

  return {
    ok: true,
    application: {
      firstName,
      videosPerDay: videosOption.value,
      phone,
      utmCampaign: normalizeUtmCampaign(text(formData, "utmCampaign")),
    },
  };
}
