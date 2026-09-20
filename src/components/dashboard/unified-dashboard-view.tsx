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
  tone = "light",
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "flex gap-1 rounded-2xl border p-1.5",
        dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50"
      )}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
            dark
              ? active === tab.id
                ? "bg-white/10 text-pink-400 shadow-sm"
                : "text-zinc-400 hover:text-white"
              : active === tab.id
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
  const dark = activeTab === "installation";

  function setActiveTab(tab: Tab) {
    const url = tab === "account" ? "/dashboard?tab=account" : "/dashboard";
    router.replace(url, { scroll: false });
  }

  return (
    <div className={cn("min-h-screen", dark ? "bg-zinc-950 text-white" : "bg-background")}>
      <DashboardPageHeader tone={dark ? "dark" : "light"} />

      <main className="p-4 pb-8 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <DashboardTabs
            active={activeTab}
            onChange={setActiveTab}
            tone={dark ? "dark" : "light"}
          />

          <div className="mt-8">
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
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement de ton espace client...
        </div>
      }
    >
      <UnifiedDashboardContent />
    </Suspense>
  );
}
