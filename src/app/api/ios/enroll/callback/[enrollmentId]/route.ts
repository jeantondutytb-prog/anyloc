import { parseDeviceAttributes } from "@/lib/ios-adhoc/mobileconfig";
import { completeIosEnrollment } from "@/lib/ios-adhoc/service";
import { getConfiguredAppOrigin } from "@/lib/oauth-origin";

const MAX_BODY_BYTES = 64 * 1024;

type RouteContext = { params: Promise<{ enrollmentId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { enrollmentId } = await context.params;
  const origin = getConfiguredAppOrigin() || new URL(request.url).origin;
  const body = Buffer.from(await request.arrayBuffer());

  let ok = false;
  if (body.length > 0 && body.length <= MAX_BODY_BYTES) {
    const attrs = parseDeviceAttributes(body);
    if (attrs) {
      ok = (await completeIosEnrollment(enrollmentId, attrs, new Date())).ok;
    }
  }

  const target = new URL("/dashboard/iphone", origin);
  target.searchParams.set("etape", ok ? "preparation" : "erreur");

  // iOS exige une redirection 301 en réponse au Profile Service.
  return new Response(null, { status: 301, headers: { Location: target.toString() } });
}
