import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

// Connecte Anyloc Setup sans retaper son mot de passe : le navigateur
// (déjà connecté) crée un lien de connexion à usage unique et le passe à
// l'app via anyloc-setup://. L'app l'échange contre une session Supabase.

function page(title: string, body: string) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0f;color:#f4f4f5;font:16px/1.5 system-ui,sans-serif;padding:16px}main{max-width:420px;text-align:center}h1{font-size:22px;margin:0 0 8px}p{color:#a1a1aa;margin:0 0 20px}a.btn{display:inline-block;background:linear-gradient(90deg,#ec4899,#8b5cf6);color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:12px}a.small{color:#a1a1aa;font-size:14px}</style></head>
<body><main>${body}</main></body></html>`;
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(new URL("/login?next=/desktop/connect", origin));
  }

  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  });

  if (error || !data.properties?.hashed_token) {
    console.error("[desktop/connect] generateLink failed:", error);
    return new Response(
      page("Anyloc", `<h1>Connexion impossible</h1><p>Réessaie dans un instant, ou connecte-toi directement dans l'app avec ton email.</p>`),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
    );
  }

  const deepLink = `anyloc-setup://auth?token_hash=${encodeURIComponent(data.properties.hashed_token)}`;

  return new Response(
    page(
      "Ouvrir Anyloc",
      `<h1>Ouverture d'Anyloc…</h1>
<p>Si ton navigateur demande d'ouvrir Anyloc, accepte. Tu seras connecté automatiquement.</p>
<a class="btn" href="${deepLink}">Ouvrir Anyloc</a>
<p style="margin-top:20px"><a class="small" href="/dashboard">Pas encore installé ? Télécharger Anyloc</a></p>
<script>location.href=${JSON.stringify(deepLink)}</script>`
    ),
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }
  );
}
