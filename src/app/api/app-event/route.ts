import { desktopInstallDistinctId, parseAppEventReport } from "@/lib/app-event";
import { aliasPostHogUser, capturePostHogEvent } from "@/lib/posthog/server";
import { getAuthenticatedUser } from "@/lib/subscription";

/**
 * Install steps from the desktop app. Before login they land on the install
 * (`desktop:<install id>`); the login merges that install into the user, so
 * one PostHog person shows the whole path from download to first location.
 */
export async function POST(request: Request) {
  const report = parseAppEventReport(await request.json().catch(() => null));

  if (!report) {
    return Response.json({ error: "Événement invalide." }, { status: 400 });
  }

  const userId = (await getAuthenticatedUser())?.id;
  const installDistinctId = desktopInstallDistinctId(report.installId);

  if (userId && report.event === "desktop_logged_in") {
    await aliasPostHogUser({ distinctId: userId, alias: installDistinctId });
  }

  await capturePostHogEvent({
    distinctId: userId ?? installDistinctId,
    event: report.event,
    properties: {
      ...report.properties,
      platform: "desktop",
      install_id: report.installId,
      app_version: report.appVersion,
    },
  });

  return new Response(null, { status: 204 });
}
