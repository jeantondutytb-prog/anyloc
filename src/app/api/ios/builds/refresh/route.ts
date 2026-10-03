import { isBuildCallbackAuthorized } from "@/lib/ios-adhoc/callback-auth";
import { queueBuild } from "@/lib/ios-adhoc/service";

// Called by the iOS build workflow once a new base app is published, so every
// registered iPhone gets the new version signed.
export async function POST(request: Request) {
  if (!isBuildCallbackAuthorized(request)) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  await queueBuild(new Date());
  return Response.json({ ok: true });
}
