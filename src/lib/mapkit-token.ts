import { importPKCS8, SignJWT } from "jose";

function getMapKitCredentials() {
  const teamId = process.env.APPLE_MAPKIT_TEAM_ID;
  const keyId = process.env.APPLE_MAPKIT_KEY_ID;
  const privateKey = process.env.APPLE_MAPKIT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!teamId || !keyId || !privateKey) {
    return null;
  }

  return { teamId, keyId, privateKey };
}

export function isMapKitConfigured() {
  return getMapKitCredentials() !== null;
}

export async function createMapKitToken() {
  const credentials = getMapKitCredentials();

  if (!credentials) {
    throw new Error("Apple MapKit n'est pas configuré.");
  }

  const key = await importPKCS8(credentials.privateKey, "ES256");

  return new SignJWT({})
    .setProtectedHeader({
      alg: "ES256",
      kid: credentials.keyId,
      typ: "JWT",
    })
    .setIssuer(credentials.teamId)
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(key);
}
