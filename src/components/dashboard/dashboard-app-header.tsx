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
    // Same floating pill as the landing header.
    <header className="sticky top-0 z-20 px-2 pt-2 sm:px-4 sm:pt-3">
      <div className="relative mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border border-zinc-200/80 bg-white/85 pr-3 pl-2 shadow-lg shadow-zinc-900/5 backdrop-blur-md sm:pr-4 sm:pl-4">
        {/* Menu on a phone, tabs from lg up; the logo sits centered over both. */}
        <div className="flex items-center gap-1">
          <div className="lg:hidden">
            <Suspense fallback={null}>
              <DashboardMenu />
            </Suspense>
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
                    "rounded-full px-3 py-2 text-sm font-medium transition-colors",
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
        </div>

        <Logo className="absolute left-1/2 -translate-x-1/2" />

        <div className="flex items-center gap-2">
          {statusLabel ? (
            <span className="hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
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
