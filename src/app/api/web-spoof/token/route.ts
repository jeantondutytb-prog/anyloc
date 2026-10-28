import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/log-error";
import { detectUserPlatform } from "@/lib/platform";
import {
  generateDeviceToken,
  hashDeviceToken,
} from "@/lib/device";
import {
  DEVICE_LIMIT_ERROR,
  getDeviceByToken,
  hasReachedDeviceLimit,
} from "@/lib/device-server";
import { rejectCrossSiteMutation } from "@/lib/csrf";
import { requireActiveSubscription } from "@/lib/subscription";
import { limitByIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = limitByIp(request, "web-spoof-token", 20, 60 * 60_000);
  if (limited) {
    return limited;
  }

  const crossSiteResponse = rejectCrossSiteMutation(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const { user, error, access } = await requireActiveSubscription();

  if (!user) {
    return Response.json({ error }, { status: 401 });
  }

  if (!access?.hasAccess) {
    return Response.json({ error }, { status: 403 });
  }

  let existingToken: string | null = null;

  try {
    const body = (await request.json()) as { token?: unknown };
    if (typeof body.token === "string" && body.token.startsWith("anyloc_")) {
      existingToken = body.token.trim();
    }
  } catch {
    existingToken = null;
  }

  if (existingToken) {
    const device = await getDeviceByToken(existingToken);
    if (device && device.user_id === user.id) {
      return Response.json({ token: existingToken, reused: true });
    }
  }

  if (await hasReachedDeviceLimit(user.id, access)) {
    return Response.json({ error: DEVICE_LIMIT_ERROR }, { status: 409 });
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  const platform = detectUserPlatform(userAgent) === "android" ? "android" : "ios";
  const token = generateDeviceToken();
  // Users have no INSERT policy on device_tokens: the token is created here,
  // after the subscription and device-limit checks.
  const admin = createAdminClient();

  const { error: dbError } = await admin.from("device_tokens").insert({
    user_id: user.id,
    token_hash: hashDeviceToken(token),
    platform,
    device_name: "Navigateur web",
  });

  if (dbError) {
    await logError("web-spoof/token", dbError, { userId: user.id });
    return Response.json(
      { error: "Impossible de préparer le raccourci GPS." },
      { status: 500 }
    );
  }

  return Response.json({ token, reused: false });
}
