"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  MapPin,
  Route,
  Settings,
  Smartphone,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: MapPin, label: "Carte", href: "/dashboard" },
  { icon: Route, label: "Routes", href: "/dashboard", disabled: true },
  { icon: Bookmark, label: "Favoris", href: "/dashboard", disabled: true },
  { icon: Smartphone, label: "Appareils", href: "/setup/ios" },
  { icon: Settings, label: "Paramètres", href: "/dashboard", disabled: true },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 bg-logo-background px-4 lg:hidden">
        <Logo />
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          Abonnement actif
        </span>
      </header>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-logo-background lg:flex">
        <div className="p-4">
          <Logo className="px-2 py-4" />

          <nav className="mt-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = !item.disabled && pathname === item.href;

              if (item.disabled) {
                return (
                  <span
                    key={item.label}
                    className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400"
                    title="Bientôt disponible"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    <span className="ml-auto rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium">
                      Bientôt
                    </span>
                  </span>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-pink-500/10 text-pink-600"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-zinc-200 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-xs font-bold text-white">
              AN
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">
                Mon compte
              </p>
              <p className="truncate text-xs text-zinc-500">Plan annuel</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pb-20 lg:pb-0">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-zinc-200 bg-white px-2 py-2 lg:hidden">
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const active = !item.disabled && pathname === item.href;

          if (item.disabled) {
            return (
              <span
                key={item.label}
                className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] text-zinc-400"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors",
                active ? "text-pink-600" : "text-zinc-500"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
