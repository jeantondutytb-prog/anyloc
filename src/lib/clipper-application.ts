export const CLIPPER_VIDEOS_PER_DAY = [
  { value: "1", label: "1 vidéo" },
  { value: "2-3", label: "2 à 3 vidéos" },
  { value: "4+", label: "4 ou plus" },
] as const;

export type ClipperVideosPerDay = (typeof CLIPPER_VIDEOS_PER_DAY)[number]["value"];

export type ClipperApplication = {
  firstName: string;
  instagram: string;
  videosPerDay: ClipperVideosPerDay;
  phone: string | null;
  utmCampaign: string | null;
};

export type ClipperApplicationResult =
  | { ok: true; application: ClipperApplication }
  | { ok: false; error: string };

const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/;
const UTM_CAMPAIGN = /^[a-z0-9_-]{1,64}$/;
const E164_PHONE = /^\+[1-9]\d{7,14}$/;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

// Accepte "@pseudo", "pseudo" ou un lien instagram.com/pseudo.
export function normalizeInstagramHandle(input: string) {
  const handle = input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .toLowerCase();

  return INSTAGRAM_HANDLE.test(handle) ? handle : null;
}

// Met le numéro au format +33612345678 ; "06 12 34 56 78" est lu comme un numéro français.
export function normalizePhone(input: string) {
  let phone = input.trim().replace(/[\s.()-]/g, "");

  if (phone.startsWith("00")) {
    phone = `+${phone.slice(2)}`;
  } else if (/^0[1-9]\d{8}$/.test(phone)) {
    phone = `+33${phone.slice(1)}`;
  }

  return E164_PHONE.test(phone) ? phone : null;
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

  const instagram = normalizeInstagramHandle(text(formData, "instagram"));
  if (!instagram) {
    return { ok: false, error: "Ce pseudo Instagram n'a pas l'air valide." };
  }

  // Facultatif : vide c'est ok, mal formé non.
  const rawPhone = text(formData, "phone");
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) {
    return { ok: false, error: "Ce numéro n'a pas l'air valide. Ex. : 06 12 34 56 78." };
  }

  return {
    ok: true,
    application: {
      firstName,
      instagram,
      videosPerDay: videosOption.value,
      phone,
      utmCampaign: normalizeUtmCampaign(text(formData, "utmCampaign")),
    },
  };
}
