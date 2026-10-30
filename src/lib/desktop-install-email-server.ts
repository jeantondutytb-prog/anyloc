import {
  buildDesktopInstallEmail,
  type DesktopInstallEmailSource,
} from "@/lib/desktop-install-email";
import { isResendConfigured, sendEmail } from "@/lib/email/resend";
import { getAppUrl } from "@/lib/stripe";

/** Throws when Resend is missing or refuses the email; callers decide what that means. */
export async function sendDesktopInstallEmail(
  to: string,
  source: DesktopInstallEmailSource
) {
  if (!isResendConfigured()) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return sendEmail({
    to,
    ...buildDesktopInstallEmail({ appUrl: getAppUrl(), source }),
    tags: [{ name: "campaign", value: `desktop_install_${source}` }],
  });
}
