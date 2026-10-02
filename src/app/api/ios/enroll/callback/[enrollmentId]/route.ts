import { parseDeviceAttributes } from "@/lib/ios-adhoc/mobileconfig";
import { completeIosEnrollment } from "@/lib/ios-adhoc/service";
import { getRequestOrigin } from "@/lib/oauth-origin";
import { limitByIp } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 64 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ enrollmentId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const limited = limitByIp(request, "ios-enroll", 10, 60 * 60_000);
  if (limited) {
    return limited;
  }

  const { enrollmentId } = await context.params;
  const origin = getRequestOrigin(request);
  const body = Buffer.from(await request.arrayBuffer());

  let ok = false;
  if (UUID_RE.test(enrollmentId) && body.length > 0 && body.length <= MAX_BODY_BYTES) {
    const attrs = parseDeviceAttributes(body);
    if (attrs) {
      ok = (await completeIosEnrollment(enrollmentId, attrs, new Date())).ok;
    }
  }

  const target = new URL("/dashboard", origin);
  target.searchParams.set("etape", ok ? "preparation" : "erreur");

  // iOS exige une redirection 301 en réponse au Profile Service.
  return new Response(null, { status: 301, headers: { Location: target.toString() } });
}
