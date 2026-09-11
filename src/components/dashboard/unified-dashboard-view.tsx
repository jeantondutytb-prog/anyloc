"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Smartphone, User } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { InstallationGuideView } from "@/components/dashboard/installation-guide-view";
import { SettingsView } from "@/components/dashboard/settings-view";
import { cn } from "@/lib/utils";

type Tab = "installation" | "account";

const TABS: { id: Tab; label: string; icon: typeof Smartphone }[] = [
  { id: "installation", label: "Installation", icon: Smartphone },
  { id: "account", label: "Mon compte", icon: User },
];

function DashboardTabs({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <div className="flex gap-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
            active === tab.id
              ? "bg-white text-pink-600 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          )}
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function UnifiedDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab: Tab = searchParams.get("tab") === "account" ? "account" : "installation";

  function setActiveTab(tab: Tab) {
    const url = tab === "account" ? "/dashboard?tab=account" : "/dashboard";
    router.replace(url, { scroll: false });
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardPageHeader />

      <main className="p-4 pb-8 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <DashboardTabs active={activeTab} onChange={setActiveTab} />

          <div className="mt-6">
            {activeTab === "installation" ? (
              <InstallationGuideView embedded />
            ) : (
              <SettingsView embedded />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export function UnifiedDashboardView() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement de ton espace client...
        </div>
      }
    >
      <UnifiedDashboardContent />
    </Suspense>
  );
}
