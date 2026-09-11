"use client";

import { DashboardMenu } from "@/components/dashboard/dashboard-menu";
import { Logo } from "@/components/ui/logo";

export function DashboardPageHeader({ title }: { title?: string } = {}) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-logo-background/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <DashboardMenu />
        {title ? (
          <h1 className="text-base font-semibold text-zinc-900">{title}</h1>
        ) : (
          <Logo nameClassName="text-base font-bold" />
        )}
      </div>
    </header>
  );
}
