import { isRemoteAppPath } from "@/lib/onboarding-experiment";
import { SUBSCRIPTION_EXPIRED_PATH } from "@/lib/subscription-inactive";
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

/** Where to send an account after login or signup, given its access. */
export function pickPostAuthRedirect(hasAccess: boolean, requestedRedirect?: string | null) {
  const redirect = sanitizeRedirectPath(requestedRedirect, "");

  if (hasAccess) {
    if (!redirect || isCheckoutPath(redirect) || isOnboardingPath(redirect)) {
      return DEFAULT_SUBSCRIBED_DESTINATION;
    }

    return redirect;
  }

  // The web remote lets accounts without a subscription in: the app half of
  // the onboarding test teleports there before the paywall.
  if (
    redirect &&
    (isCheckoutPath(redirect) || isOnboardingPath(redirect) || isRemoteAppPath(redirect))
  ) {
    return redirect;
  }

  return SUBSCRIPTION_EXPIRED_PATH;
}

export async function resolvePostAuthRedirect(
  userId: string,
  email: string | null | undefined,
  requestedRedirect?: string | null
) {
  const access = await getSubscriptionAccessForUser(userId, email);
  return pickPostAuthRedirect(access.hasAccess, requestedRedirect);
}
