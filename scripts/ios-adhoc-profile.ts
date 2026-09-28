import { writeFileSync } from "node:fs";
import { ascCredentialsFromEnv, createAscClient } from "../src/lib/ios-adhoc/app-store-connect";
import { IOS_ADHOC_BUNDLE_ID } from "../src/lib/ios-adhoc/config";

const PROFILE_NAME = "Anyloc AdHoc";

async function main() {
  const [outProfile, outUdids] = process.argv.slice(2);
  const certificateId = process.env.ASC_DISTRIBUTION_CERT_ID?.trim();

  if (!outProfile || !outUdids || !certificateId) {
    console.error("Usage: ASC_DISTRIBUTION_CERT_ID=… tsx scripts/ios-adhoc-profile.ts <out.mobileprovision> <out-udids.json>");
    process.exit(1);
  }

  const asc = createAscClient(ascCredentialsFromEnv());
  const bundleIdId = await asc.findBundleIdId(IOS_ADHOC_BUNDLE_ID);
  const devices = await asc.listEnabledIosDevices();

  if (!devices.length) {
    throw new Error("Aucun iPhone enregistré sur le compte Apple.");
  }

  await asc.deleteProfilesNamed(PROFILE_NAME);
  const content = await asc.createAdhocProfile({
    name: PROFILE_NAME,
    bundleIdId,
    certificateId,
    deviceIds: devices.map((device) => device.id),
  });

  writeFileSync(outProfile, Buffer.from(content, "base64"));
  writeFileSync(outUdids, JSON.stringify(devices.map((device) => device.udid)));
  console.log(`Profil ad hoc généré pour ${devices.length} iPhone(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
