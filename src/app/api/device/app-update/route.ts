import { extractBearerToken } from "@/lib/device";
import { getDeviceByToken } from "@/lib/device-server";
import { fetchLatestAndroidRelease } from "@/lib/android-update";

/** The Android app asks here whether a newer APK is out (in-app updates). */
export async function GET(request: Request) {
  const token = extractBearerToken(request);

  if (!token) {
    return Response.json(
      { error: "Authorization Bearer token requis." },
      { status: 401 }
    );
  }

  const device = await getDeviceByToken(token);

  if (!device) {
    return Response.json({ error: "Token appareil invalide." }, { status: 401 });
  }

  const latest = await fetchLatestAndroidRelease().catch(() => null);

  if (!latest) {
    return Response.json({ error: "Version introuvable." }, { status: 503 });
  }

  return Response.json(latest, {
    headers: { "Cache-Control": "no-store" },
  });
}
