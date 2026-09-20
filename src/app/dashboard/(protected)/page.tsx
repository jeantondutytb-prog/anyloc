import { DashboardHomeView } from "@/components/dashboard/dashboard-home-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function DashboardPage() {
  return <DashboardHomeView />;
}
