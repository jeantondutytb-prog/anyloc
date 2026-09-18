import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { InstallationGuideView } from "@/components/dashboard/installation-guide-view";

export default function InstallationPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement du guide...
        </div>
      }
    >
      <InstallationGuideView preview />
    </Suspense>
  );
}
