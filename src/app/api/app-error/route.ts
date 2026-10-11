import { parseAppErrorReport } from "@/lib/app-error";
import { extractBearerToken } from "@/lib/device";
import { getDeviceByToken } from "@/lib/device-server";
import { logError } from "@/lib/log-error";
import { getAuthenticatedUser } from "@/lib/subscription";

/**
 * Errors from the iOS, Android and desktop apps, which have no logs we can
 * read: they land in PostHog on the user (device token or Supabase session),
 * next to their web errors and events.
 */
export async function POST(request: Request) {
  const report = parseAppErrorReport(await request.json().catch(() => null));

  if (!report) {
    return Response.json({ error: "Rapport invalide." }, { status: 400 });
  }

  const deviceToken = extractBearerToken(request);
  const device = deviceToken ? await getDeviceByToken(deviceToken) : null;
  const userId = device?.user_id ?? (await getAuthenticatedUser())?.id;

  await logError(`app/${report.platform}/${report.scope}`, report.message, {
    ...report.context,
    userId,
    platform: report.platform,
    app_version: report.appVersion,
    device_id: device?.id,
  });

  return new Response(null, { status: 204 });
}
