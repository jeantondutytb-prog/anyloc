import { IOS_ADHOC_ELIGIBLE_PLANS } from "@/lib/ios-adhoc/config";

/**
 * Most buyers pay on their iPhone, but the monthly plan installs on a computer:
 * this email carries the dashboard link to the inbox they'll open on the Mac/PC.
 */
export type DesktopInstallEmailSource = "after_purchase" | "dashboard_button";

/** Plans with the iPhone app install on the phone itself, so they don't need it. */
export function planNeedsDesktopInstall(planId: string | null | undefined) {
  return !planId || !IOS_ADHOC_ELIGIBLE_PLANS.has(planId);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildDesktopInstallEmail({
  appUrl,
  source,
}: {
  appUrl: string;
  source: DesktopInstallEmailSource;
}) {
  const ctaUrl =
    `${appUrl}/dashboard` +
    `?utm_source=email&utm_medium=email&utm_campaign=desktop_install_${source}`;
  const cta = "Télécharger Anyloc";

  const subject = "Ton lien pour installer Anyloc sur ton ordi";
  const intro =
    source === "after_purchase"
      ? "Salut, merci pour ton achat ! Ton accès Anyloc est actif."
      : "Salut, voici le lien que tu as demandé.";
  const paragraphs = [
    intro,
    "Anyloc s'installe sur un ordinateur (Mac ou PC), puis tu branches ton iPhone en USB. Ouvre ce mail sur ton ordi et clique sur le bouton :",
  ];
  const steps = [
    "Télécharge Anyloc et connecte-toi avec ce même email",
    "Ouvre l'app et branche ton iPhone en USB",
    "Choisis ta ville — c'est tout, vérifie dans Snap",
  ];
  const outro = "Un souci pendant l'installation ? Réponds à ce mail : on règle ça ensemble.";

  const text = [
    ...paragraphs,
    `${cta} : ${ctaUrl}`,
    steps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
    outro,
    "Jean, fondateur d'Anyloc",
  ].join("\n\n");

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
${paragraphs
  .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${escapeHtml(p)}</p>`)
  .join("\n")}
<p style="margin:24px 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:12px">${escapeHtml(cta)}</a></p>
<ol style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;color:#3f3f46">
${steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("\n")}
</ol>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${escapeHtml(outro)}</p>
<p style="margin:0;font-size:14px;line-height:1.5;color:#52525b">Jean, fondateur d'Anyloc</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  return { subject, html, text };
}
