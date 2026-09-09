"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Menu, Route, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const MENU_ITEMS = [
  { icon: MapPin, label: "Carte", href: "/dashboard" },
  { icon: Smartphone, label: "Installation", href: "/dashboard/installation" },
  { icon: Route, label: "Trajets", href: "/dashboard/routes" },
];

export function DashboardMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/95 text-zinc-700 shadow-lg backdrop-blur-md transition-colors hover:bg-white hover:text-pink-600"
        aria-label="Menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <ul className="p-1.5">
            {MENU_ITEMS.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-pink-500/10 text-pink-600"
                        : "text-zinc-700 hover:bg-zinc-50"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
