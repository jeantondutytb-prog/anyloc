"use client";

import { DashboardMenu } from "@/components/dashboard/dashboard-menu";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export function DashboardPageHeader({
  title,
  tone = "light",
}: { title?: string; tone?: "light" | "dark" } = {}) {
  const dark = tone === "dark";

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b px-4 py-3 backdrop-blur-sm",
        dark
          ? "border-white/10 bg-zinc-950/90"
          : "border-zinc-200 bg-logo-background/95"
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <DashboardMenu />
        {title ? (
          <h1
            className={cn(
              "text-base font-semibold",
              dark ? "text-white" : "text-zinc-900"
            )}
          >
            {title}
          </h1>
        ) : (
          <Logo
            nameClassName={cn("text-base font-bold", dark && "text-white")}
          />
        )}
      </div>
    </header>
  );
}
