import { createAdminClient } from "@/lib/supabase/admin";

// Signed IPAs live in a private Supabase Storage bucket. The re-sign workflow
// posts the IPA to /api/ios/builds/complete, so GitHub needs no Supabase key.

const BUCKET = "ios-adhoc";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Well under Vercel's 4.5 MB request limit once base64-encoded. */
export const MAX_IPA_BYTES = 3 * 1024 * 1024;

export async function storeIpa(buildId: string, ipa: Buffer) {
  const storage = createAdminClient().storage;
  const path = `builds/${buildId}.ipa`;
  const upload = () =>
    storage.from(BUCKET).upload(path, ipa, { contentType: "application/octet-stream", upsert: true });

  let { error } = await upload();
  if (error && /bucket not found/i.test(error.message)) {
    await storage.createBucket(BUCKET, { public: false });
    ({ error } = await upload());
  }
  if (error) throw error;
  return path;
}

export async function signedIpaUrl(path: string) {
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}
