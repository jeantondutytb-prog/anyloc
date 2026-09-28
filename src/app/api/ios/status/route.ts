import { IOS_ADHOC_INSTALL_LINK_TTL_MS, isEligibleForIosAdhoc } from "@/lib/ios-adhoc/config";
import { buildItmsServicesUrl, signInstallToken } from "@/lib/ios-adhoc/install-link";
import { getIosStatusForUser } from "@/lib/ios-adhoc/service";
import { getRequestOrigin } from "@/lib/oauth-origin";
import { requireActiveSubscription } from "@/lib/subscription";

export async function GET(request: Request) {
  const { user, access, error } = await requireActiveSubscription();

  if (!user) {
    return Response.json({ error }, { status: 401 });
  }

  if (!isEligibleForIosAdhoc(access)) {
    return Response.json({ eligible: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const now = new Date();
  const state = await getIosStatusForUser(user.id, now);
  let installUrl: string | null = null;

  if (state.kind === "ready") {
    const secret = process.env.IOS_INSTALL_LINK_SECRET;
    if (!secret) {
      return Response.json({ error: "Installation indisponible." }, { status: 503 });
    }
    const origin = getRequestOrigin(request);
    const token = signInstallToken(
      { userId: user.id, buildId: state.buildId, exp: now.getTime() + IOS_ADHOC_INSTALL_LINK_TTL_MS },
      secret
    );
    installUrl = buildItmsServicesUrl(`${origin}/api/ios/manifest?t=${encodeURIComponent(token)}`);
  }

  return Response.json(
    { eligible: true, state, installUrl },
    { headers: { "Cache-Control": "no-store" } }
  );
}
