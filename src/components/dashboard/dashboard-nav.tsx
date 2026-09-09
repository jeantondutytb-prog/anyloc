"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Route, Smartphone } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: MapPin, label: "Carte", href: "/dashboard" },
  { icon: Smartphone, label: "Installation", href: "/dashboard/installation" },
  { icon: Route, label: "Trajets", href: "/dashboard/routes" },
];

export function DashboardNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-zinc-200 bg-white px-2 py-2 lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

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
    );
  }

  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-logo-background p-4 lg:block">
      <Logo className="px-2 py-4" />

      <nav className="mt-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

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
    </aside>
  );
}
