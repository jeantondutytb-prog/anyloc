import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-zinc-500">
      Chargement de ton espace client...
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardView />
    </Suspense>
  );
}
