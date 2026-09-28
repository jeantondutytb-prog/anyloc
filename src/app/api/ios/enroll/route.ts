import { randomUUID } from "node:crypto";
import { isEligibleForIosAdhoc } from "@/lib/ios-adhoc/config";
import { buildEnrollmentProfile } from "@/lib/ios-adhoc/mobileconfig";
import { startIosEnrollment } from "@/lib/ios-adhoc/service";
import { getConfiguredAppOrigin } from "@/lib/oauth-origin";
import { requireActiveSubscription } from "@/lib/subscription";

export async function GET(request: Request) {
  const origin = getConfiguredAppOrigin() || new URL(request.url).origin;
  const { user, access } = await requireActiveSubscription();

  if (!user) {
    return Response.redirect(`${origin}/login?next=/dashboard/iphone`, 303);
  }

  if (!isEligibleForIosAdhoc(access)) {
    return Response.json({ error: "L'app iPhone est incluse dans la formule 1 an." }, { status: 403 });
  }

  const result = await startIosEnrollment(user.id, new Date());

  if (result.kind === "already_registered") {
    return Response.redirect(`${origin}/dashboard/iphone`, 303);
  }

  if (result.kind === "quota_full") {
    return Response.json(
      { error: "Les places iPhone sont pleines pour le moment. Écris-nous sur le chat, on te réserve la prochaine." },
      { status: 503 }
    );
  }

  const profile = buildEnrollmentProfile({
    callbackUrl: `${origin}/api/ios/enroll/callback/${result.enrollmentId}`,
    challenge: result.challenge,
    profileUuid: randomUUID(),
  });

  return new Response(profile, {
    headers: {
      "Content-Type": "application/x-apple-aspen-config",
      "Content-Disposition": 'attachment; filename="Anyloc.mobileconfig"',
      "Cache-Control": "no-store",
    },
  });
}
