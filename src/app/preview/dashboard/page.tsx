import { notFound } from "next/navigation";
import { UnifiedDashboardView } from "@/components/dashboard/unified-dashboard-view";

export default function DashboardPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <UnifiedDashboardView preview />;
}
