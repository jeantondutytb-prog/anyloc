import { UnifiedDashboardView } from "@/components/dashboard/unified-dashboard-view";
import { isEligibleForIosAdhoc } from "@/lib/ios-adhoc/config";
import { noIndexMetadata } from "@/lib/seo";
import {
  getAuthenticatedUser,
  getSubscriptionAccessForUser,
} from "@/lib/subscription";

export const metadata = noIndexMetadata;

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  const access = user
    ? await getSubscriptionAccessForUser(user.id, user.email)
    : null;

  return (
    <UnifiedDashboardView track={isEligibleForIosAdhoc(access) ? "iphone" : "desktop"} />
  );
}
