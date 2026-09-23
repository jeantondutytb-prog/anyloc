"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DashboardAppHeader } from "@/components/dashboard/dashboard-app-header";
import { PaidDashboardView } from "@/components/dashboard/paid-dashboard-view";
import { SettingsView } from "@/components/dashboard/settings-view";
import { dashboardHref, getDashboardBasePath } from "@/lib/dashboard-paths";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = readTab(searchParams.get("tab"));
  const basePath = getDashboardBasePath(pathname);

  useEffect(() => {
    if (activeTab === "install") {
      router.replace(dashboardHref(basePath));
    }
  }, [activeTab, basePath, router]);

  if (activeTab === "home" || activeTab === "install") {
    return <PaidDashboardView preview={preview} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardAppHeader
        activeTab="account"
        statusLabel={preview ? "Abonnement actif" : undefined}
        planLabel={preview ? "Plan annuel" : undefined}
      />
      <main className="p-4 pb-8 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          {preview ? (
            <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500">
              Aperçu du compte — connecte-toi pour voir tes factures et ton
              abonnement.
            </p>
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
