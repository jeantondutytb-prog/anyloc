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
};

export type ClipperApplicationResult =
  | { ok: true; application: ClipperApplication }
  | { ok: false; error: string };

const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/;

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

  return {
    ok: true,
    application: { firstName, instagram, videosPerDay: videosOption.value },
  };
}
