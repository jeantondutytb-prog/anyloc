import { Suspense } from "react";
import { RoutesView } from "@/components/dashboard/routes-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

function RoutesLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-zinc-500">
      Chargement des trajets...
    </div>
  );
}

export default function DashboardRoutesPage() {
  return (
    <Suspense fallback={<RoutesLoading />}>
      <RoutesView />
    </Suspense>
  );
}
