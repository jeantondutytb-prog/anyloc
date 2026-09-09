import { Suspense } from "react";
import { InstallationGuideView } from "@/components/dashboard/installation-guide-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

function InstallationLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-zinc-500">
      Chargement du guide d&apos;installation...
    </div>
  );
}

export default function InstallationPage() {
  return (
    <Suspense fallback={<InstallationLoading />}>
      <InstallationGuideView />
    </Suspense>
  );
}
