import { NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/checkout-recovery";
import { unsubscribeFromCheckoutRecovery } from "@/lib/checkout-recovery-server";

export const runtime = "nodejs";

async function unsubscribe(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";

  if (!userId || !token || !verifyUnsubscribeToken(userId, token)) {
    return null;
  }

  await unsubscribeFromCheckoutRecovery(userId);
  return userId;
}

function page(message: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anyloc</title></head>` +
      `<body style="font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;padding:0 16px;color:#18181b">` +
      `<p style="font-size:18px">${message}</p><p><a href="/" style="color:#ec4899">Retour à Anyloc</a></p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request: Request) {
  try {
    const userId = await unsubscribe(request);
    return userId
      ? page("C'est noté, tu ne recevras plus ces emails.")
      : page("Lien de désinscription invalide.", 400);
  } catch (error) {
    console.error("[email/unsubscribe]", error);
    return page("Une erreur est survenue, réessaie plus tard.", 500);
  }
}

/** One-click unsubscribe from the mail client (RFC 8058). */
export async function POST(request: Request) {
  try {
    const userId = await unsubscribe(request);
    return new NextResponse(null, { status: userId ? 200 : 400 });
  } catch (error) {
    console.error("[email/unsubscribe]", error);
    return new NextResponse(null, { status: 500 });
  }
}
