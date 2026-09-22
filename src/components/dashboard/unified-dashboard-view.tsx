"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { InstallationGuideView } from "@/components/dashboard/installation-guide-view";
import { PaidDashboardView } from "@/components/dashboard/paid-dashboard-view";
import { SettingsView } from "@/components/dashboard/settings-view";

type Tab = "home" | "install" | "account";

function readTab(value: string | null): Tab {
  if (value === "account") {
    return "account";
  }

  if (value === "install" || value === "installation") {
    return "install";
  }

  return "home";
}

function UnifiedDashboardContent({ preview = false }: { preview?: boolean }) {
  const searchParams = useSearchParams();
  const activeTab = readTab(searchParams.get("tab"));

  if (activeTab === "home") {
    return <PaidDashboardView preview={preview} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardPageHeader />
      <main className="p-4 pb-8 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          {activeTab === "install" ? (
            <InstallationGuideView embedded preview={preview} />
          ) : (
            <SettingsView embedded />
          )}
        </div>
      </main>
    </div>
  );
}

export function UnifiedDashboardView({
  preview = false,
}: {
  preview?: boolean;
} = {}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement de ton espace client...
        </div>
      }
    >
      <UnifiedDashboardContent preview={preview} />
    </Suspense>
  );
}
