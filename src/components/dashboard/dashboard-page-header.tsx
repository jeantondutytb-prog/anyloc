"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardMenu } from "@/components/dashboard/dashboard-menu";
import { Logo } from "@/components/ui/logo";

export function DashboardPageHeader({
  title,
  showBack = true,
}: {
  title?: string;
  showBack?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-logo-background/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <DashboardMenu />
        {showBack ? (
          <Link
            href="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:text-pink-600"
            aria-label="Retour à la carte"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : null}
        {title ? (
          <h1 className="text-base font-semibold text-zinc-900">{title}</h1>
        ) : (
          <Logo nameClassName="text-base font-bold" />
        )}
      </div>
    </header>
  );
}
