import { getCheckoutUrl } from "@/lib/constants";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";
import { getSubscriptionAccessForUser } from "@/lib/subscription";

const DEFAULT_SUBSCRIBED_DESTINATION = "/dashboard";

function getPathname(path: string) {
  return path.split("?")[0]?.split("#")[0] ?? "";
}

function isCheckoutPath(path: string) {
  return getPathname(path) === "/checkout";
}

function isOnboardingPath(path: string) {
  const pathname = getPathname(path);
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

export async function resolvePostAuthRedirect(
  userId: string,
  email: string | null | undefined,
  requestedRedirect?: string | null
) {
  const access = await getSubscriptionAccessForUser(userId, email);
  const redirect = sanitizeRedirectPath(requestedRedirect, "");

  if (access.hasAccess) {
    if (!redirect || isCheckoutPath(redirect) || isOnboardingPath(redirect)) {
      return DEFAULT_SUBSCRIBED_DESTINATION;
    }

    return redirect;
  }

  if (redirect && (isCheckoutPath(redirect) || isOnboardingPath(redirect))) {
    return redirect;
  }

  return getCheckoutUrl("annual");
}
