"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardMenu } from "@/components/dashboard/dashboard-menu";
import { Logo } from "@/components/ui/logo";
import {
  dashboardHref,
  getDashboardBasePath,
  type DashboardTab,
} from "@/lib/dashboard-paths";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { label: string; tab?: DashboardTab }[] = [
  { label: "Dashboard" },
  { label: "Mon compte", tab: "account" },
];

export function DashboardAppHeader({
  planLabel,
  statusLabel,
  activeTab = "home",
}: {
  planLabel?: string;
  statusLabel?: string;
  activeTab?: "home" | DashboardTab;
}) {
  const pathname = usePathname();
  const basePath = getDashboardBasePath(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="lg:hidden">
            <Suspense fallback={null}>
              <DashboardMenu />
            </Suspense>
          </div>
          <Logo nameClassName="text-base font-bold" />
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const tab = item.tab ?? "home";
            const active = activeTab === tab;

            return (
              <Link
                key={item.label}
                href={dashboardHref(basePath, item.tab)}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-pink-600"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {statusLabel ? (
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:inline">
              {statusLabel}
            </span>
          ) : null}
          {planLabel ? (
            <span className="hidden rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-pink-700 md:inline">
              {planLabel}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
