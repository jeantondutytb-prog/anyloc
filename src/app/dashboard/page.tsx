import { UnifiedDashboardView } from "@/components/dashboard/unified-dashboard-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function DashboardPage() {
  return <UnifiedDashboardView />;
}
