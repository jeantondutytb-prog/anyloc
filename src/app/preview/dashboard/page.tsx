import { notFound } from "next/navigation";
import { UnifiedDashboardView } from "@/components/dashboard/unified-dashboard-view";

export default async function DashboardPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  // ?track=iphone shows the 1-year plan's page (iPhone app without a computer).
  const { track } = await searchParams;
  return <UnifiedDashboardView preview track={track === "iphone" ? "iphone" : "desktop"} />;
}
