/**
 * Activation: the first time a customer's position really changes after the
 * purchase. Pure parts (sources, help email); the database side lives in
 * activation-server.ts.
 */

/** Where the first successful position change was seen. */
export type ActivationSource = "desktop" | "android" | "ios" | "unknown";

export function toActivationSource(platform: string | null | undefined): ActivationSource {
  if (platform === "android" || platform === "ios" || platform === "desktop") return platform;
  if (platform === "mac" || platform === "windows") return "desktop";
  return "unknown";
}

/** The help email goes out this long after the purchase if nothing moved by then. */
export const ACTIVATION_HELP_DELAY_MS = 60 * 60 * 1000;

/**
 * Off until Jean turns it on (ACTIVATION_HELP_EMAIL=on in Vercel): no email
 * reaches a customer before its text is approved.
 */
export function isActivationHelpEmailEnabled(env: Record<string, string | undefined> = process.env) {
  return env.ACTIVATION_HELP_EMAIL === "on";
}

export function getActivationHelpSendAt(purchasedAt: Date) {
  return new Date(purchasedAt.getTime() + ACTIVATION_HELP_DELAY_MS);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ActivationHelpEmail = { subject: string; html: string; text: string };

export const ACTIVATION_HELP_SUBJECT = "Un coup de main pour installer Anyloc ?";

export function buildActivationHelpEmail({ appUrl }: { appUrl: string }): ActivationHelpEmail {
  const ctaUrl =
    `${appUrl}/dashboard?utm_source=email&utm_medium=email&utm_campaign=activation_help`;
  const cta = "Ouvrir mon espace Anyloc";
  const intro = [
    "Salut,",
    "Merci pour ton achat ! On dirait que ta position n'a pas encore changé. Pas d'inquiétude, ça se règle en quelques minutes :",
  ];
  const steps = [
    "Ouvre ton espace Anyloc et suis les 3 étapes.",
    "Sur iPhone : installe Anyloc sur ton Mac ou ton PC, puis branche ton iPhone avec son câble. Avec la formule 1 an, tu peux aussi l'installer directement sur l'iPhone, depuis Safari.",
    "Sur Android : installe l'app Anyloc, puis choisis-la comme « application de localisation fictive » dans les options pour les développeurs.",
  ];
  const help =
    "Ça bloque ? Réponds à ce mail en me disant ton téléphone et l'étape où tu en es : je te réponds vite.";
  const signature = "Jean, fondateur d'Anyloc";
  const footer = "Tu reçois cet email parce que tu viens de t'abonner à Anyloc.";

  const text = [
    ...intro,
    steps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
    `${cta} : ${ctaUrl}`,
    help,
    signature,
    "—",
    footer,
  ].join("\n\n");

  const paragraph = (value: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${escapeHtml(value)}</p>`;

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
${intro.map(paragraph).join("\n")}
<ol style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.5">
${steps.map((step) => `<li style="margin:0 0 8px">${escapeHtml(step)}</li>`).join("\n")}
</ol>
<p style="margin:24px 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:12px">${escapeHtml(cta)}</a></p>
${paragraph(help)}
<p style="margin:0;font-size:14px;line-height:1.5;color:#52525b">${escapeHtml(signature)}</p>
</td></tr></table>
<p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#a1a1aa">${escapeHtml(footer)}</p>
</td></tr></table>
</body></html>`;

  return { subject: ACTIVATION_HELP_SUBJECT, html, text };
}
