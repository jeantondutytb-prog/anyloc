import { NextResponse } from "next/server";
import { rejectCrossSiteMutation } from "@/lib/csrf";
import { sendDesktopInstallEmail } from "@/lib/desktop-install-email-server";
import { logError } from "@/lib/log-error";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { requireAuthenticatedUser } from "@/lib/subscription";

/** Emails the signed-in customer the dashboard link, to open on their computer. */
export async function POST(request: Request) {
  const crossSiteResponse = rejectCrossSiteMutation(request);
  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const { user, error } = await requireAuthenticatedUser();

  if (!user?.email) {
    return NextResponse.json({ error: error ?? "Connecte-toi d'abord." }, { status: 401 });
  }

  const limited = rateLimit(`desktop-link-email:${user.id}`, 3, 60 * 60 * 1000);
  if (!limited.ok) {
    return tooManyRequests(limited.retryAfterSeconds);
  }

  try {
    await sendDesktopInstallEmail(user.email, "dashboard_button");
    return NextResponse.json({ ok: true, email: user.email });
  } catch (sendError) {
    await logError("desktop-link-email", sendError, { userId: user.id });
    return NextResponse.json(
      { error: "L'email n'a pas pu partir. Copie le lien à la place." },
      { status: 502 }
    );
  }
}
