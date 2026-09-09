"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, PanelRightOpen, Route, Smartphone, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import {
  filterSpotsByCategory,
  SPOT_CATEGORIES,
  type SpotCategory,
} from "@/lib/destination-spots";
import { cn } from "@/lib/utils";

export const DASHBOARD_SIDEBAR_OFFSET = 392;

const NAV_ITEMS = [
  { icon: MapPin, label: "Carte", href: "/dashboard" },
  { icon: Smartphone, label: "Installation", href: "/dashboard/installation" },
  { icon: Route, label: "Trajets", href: "/dashboard/routes" },
];

type Location = {
  name: string;
  lat: number;
  lng: number;
};

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
  showDestinations?: boolean;
  onSelectLocation?: (location: Location) => void;
  selectedName?: string;
};

export function useDashboardSidebar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setOpen(true);
    }
  }, []);

  return {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
    onToggle: () => setOpen((value) => !value),
  };
}

export function DashboardSidebarToggle({
  open,
  onOpen,
}: {
  open: boolean;
  onOpen: () => void;
}) {
  if (open) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed right-0 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-2xl border border-r-0 border-pink-200/60 bg-white/95 px-2.5 py-4 text-pink-600 shadow-xl backdrop-blur-md transition-colors hover:bg-white hover:text-pink-700"
      aria-label="Ouvrir le menu"
    >
      <PanelRightOpen className="h-5 w-5" />
      <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide [writing-mode:vertical-rl]">
        Menu
      </span>
    </button>
  );
}

export function DashboardSidebar({
  open,
  onClose,
  showDestinations = false,
  onSelectLocation,
  selectedName,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [category, setCategory] = useState<SpotCategory>("all");

  const spots = useMemo(() => filterSpotsByCategory(category), [category]);

  function handleSelect(location: Location) {
    onSelectLocation?.(location);

    if (window.matchMedia("(max-width: 1023px)").matches) {
      onClose();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "fixed z-50 flex flex-col border-zinc-200 bg-white shadow-2xl transition-transform duration-300 ease-out",
          "inset-x-0 bottom-0 max-h-[90vh] rounded-t-3xl border-t lg:inset-x-auto lg:bottom-4 lg:left-auto lg:right-4 lg:top-4 lg:max-h-none lg:w-[360px] lg:rounded-2xl lg:border",
          open
            ? "translate-y-0 lg:translate-x-0"
            : "translate-y-full lg:translate-x-[calc(100%+1.5rem)]"
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <Logo nameClassName="text-base font-bold" />
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200"
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="border-b border-zinc-100 px-3 py-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (window.matchMedia("(max-width: 1023px)").matches) {
                        onClose();
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-pink-500/10 text-pink-600"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {showDestinations && onSelectLocation && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
                Destination
              </p>
              <p className="text-sm text-zinc-500">
                Ou utilise la barre de recherche en haut de la carte.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {SPOT_CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                      category === item.id
                        ? "bg-pink-500 text-white shadow-sm"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <ul className="mt-4 space-y-1 pb-2">
                {spots.map((spot) => {
                  const isSelected = selectedName === spot.name;

                  return (
                    <li key={spot.name}>
                      <button
                        type="button"
                        onClick={() =>
                          handleSelect({
                            name: spot.name,
                            lat: spot.lat,
                            lng: spot.lng,
                          })
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                          isSelected
                            ? "bg-pink-50 ring-1 ring-pink-200"
                            : "hover:bg-zinc-50"
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-lg">
                          {spot.emoji ?? "📍"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-900">
                            {spot.name}
                          </span>
                          <span className="block text-xs capitalize text-zinc-500">
                            {
                              SPOT_CATEGORIES.find((c) => c.id === spot.category)
                                ?.label
                            }
                          </span>
                        </span>
                        <MapPin
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isSelected ? "text-pink-600" : "text-zinc-300"
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
