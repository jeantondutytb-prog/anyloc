import { getCheckoutUrl } from "@/lib/constants";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";
import { getSubscriptionAccessForUser } from "@/lib/subscription";

const DEFAULT_SUBSCRIBED_DESTINATION = "/dashboard";

function isCheckoutPath(path: string) {
  const pathname = path.split("?")[0];
  return pathname === "/checkout";
}

export async function resolvePostAuthRedirect(
  userId: string,
  email: string | null | undefined,
  requestedRedirect?: string | null
) {
  const access = await getSubscriptionAccessForUser(userId, email);
  const redirect = sanitizeRedirectPath(requestedRedirect, "");

  if (access.hasAccess) {
    if (!redirect || isCheckoutPath(redirect)) {
      return DEFAULT_SUBSCRIBED_DESTINATION;
    }

    return redirect;
  }

  if (redirect && isCheckoutPath(redirect)) {
    return redirect;
  }

  return getCheckoutUrl("annual");
}
