import { createClient } from "@/lib/supabase/server";
import { detectUserPlatform } from "@/lib/platform";
import {
  generateDeviceToken,
  hashDeviceToken,
} from "@/lib/device";
import { getDeviceByToken } from "@/lib/device-server";
import { rejectCrossSiteMutation } from "@/lib/csrf";
import { requireActiveSubscription } from "@/lib/subscription";

export async function POST(request: Request) {
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

  const userAgent = request.headers.get("user-agent") ?? "";
  const platform = detectUserPlatform(userAgent) === "android" ? "android" : "ios";
  const token = generateDeviceToken();
  const supabase = await createClient();

  const { error: dbError } = await supabase.from("device_tokens").insert({
    user_id: user.id,
    token_hash: hashDeviceToken(token),
    platform,
    device_name: "Navigateur web",
  });

  if (dbError) {
    console.error("[web-spoof/token] Register failed:", dbError);
    return Response.json(
      { error: "Impossible de préparer le raccourci GPS." },
      { status: 500 }
    );
  }

  return Response.json({ token, reused: false });
}
