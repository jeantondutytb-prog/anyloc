import { encryptPairing } from "../src/lib/pairing-crypto";
import { createAdminClient } from "../src/lib/supabase/admin";

/**
 * One-off: encrypts the pairing records saved before PAIRING_ENCRYPTION_KEY.
 * Usage: PAIRING_ENCRYPTION_KEY=… SUPABASE_SERVICE_ROLE_KEY=… NEXT_PUBLIC_SUPABASE_URL=… \
 *   npx tsx scripts/encrypt-pairings.ts
 */
async function main() {
  if (!process.env.PAIRING_ENCRYPTION_KEY) {
    throw new Error("PAIRING_ENCRYPTION_KEY manquant.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("device_tokens")
    .select("id, pairing_data")
    .not("pairing_data", "is", null)
    .not("pairing_data", "like", "enc:v1:%");

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const { error: updateError } = await admin
      .from("device_tokens")
      .update({ pairing_data: encryptPairing(row.pairing_data as string) })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(`${row.id}: ${updateError.message}`);
    }
  }

  console.log(`${data?.length ?? 0} pairing(s) chiffré(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
