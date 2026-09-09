"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
  DashboardSidebar,
  DashboardSidebarToggle,
  useDashboardSidebar,
} from "@/components/dashboard/dashboard-sidebar";
import { LocationSearch } from "@/components/dashboard/location-search";
import { useDashboardOnboarding } from "@/hooks/use-dashboard-onboarding";
import { useLocationSync } from "@/hooks/use-location-sync";
import { DEFAULT_LOCATION } from "@/lib/location";
import { cn } from "@/lib/utils";

const LocationMap = dynamic(
  () => import("@/components/dashboard/location-map"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-500">
        Chargement de la carte...
      </div>
    ),
  }
);

export function DashboardView() {
  const { hydrated, completeStep } = useDashboardOnboarding();
  const sidebar = useDashboardSidebar();

  const { location, error, saveLocation } = useLocationSync({
    onSynced: () => completeStep("activate"),
  });

  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState({
    name: DEFAULT_LOCATION.name,
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
  });
  const initialLocationRef = useRef(selected);
  const hasHydratedLocationRef = useRef(false);

  useEffect(() => {
    if (!location || hasHydratedLocationRef.current) {
      return;
    }

    setSelected({
      name: location.name,
      lat: location.lat,
      lng: location.lng,
    });
    setActive(location.isActive);
    initialLocationRef.current = {
      name: location.name,
      lat: location.lat,
      lng: location.lng,
    };
    hasHydratedLocationRef.current = true;

    if (location.isActive) {
      completeStep("activate");
    }
  }, [location, completeStep]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const changed =
      selected.name !== initialLocationRef.current.name ||
      selected.lat !== initialLocationRef.current.lat ||
      selected.lng !== initialLocationRef.current.lng;

    if (changed) {
      completeStep("chooseSpot");
    }
  }, [completeStep, hydrated, selected]);

  const handleSelectLocation = useCallback(
    async (nextLocation: { name: string; lat: number; lng: number }) => {
      setSelected(nextLocation);
      setActive(true);

      try {
        await saveLocation({
          name: nextLocation.name,
          lat: nextLocation.lat,
          lng: nextLocation.lng,
          isActive: true,
        });
      } catch {
        setActive(false);
      }
    },
    [saveLocation]
  );

  const lastSyncedLabel = location?.updatedAt
    ? new Date(location.updatedAt).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-background">
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-20 px-4 pt-3 lg:pt-4",
          sidebar.open && "lg:left-[392px]"
        )}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Logo />
          </div>

          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <LocationSearch variant="top" onSelect={handleSelectLocation} />
            </div>
            <div
              className={cn(
                "hidden shrink-0 items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-md lg:flex",
                active ? "text-pink-600" : "text-zinc-500"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  active ? "bg-pink-500 animate-pulse" : "bg-zinc-400"
                )}
              />
              {active ? "Actif" : "Pause"}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 z-0">
        <LocationMap
          selected={selected}
          onSelect={handleSelectLocation}
          active={active}
          fullScreen
          layoutKey={sidebar.open ? 1 : 0}
        />
      </div>

      {error && (
        <div
          className={cn(
            "absolute left-4 right-4 top-28 z-20 rounded-xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-700 shadow-sm backdrop-blur-sm lg:top-20 lg:left-auto lg:max-w-sm",
            sidebar.open && "lg:left-[calc(392px+1rem)]"
          )}
        >
          {error}
        </div>
      )}

      <DashboardSidebarToggle open={sidebar.open} onOpen={sidebar.onOpen} />

      <DashboardSidebar
        open={sidebar.open}
        onClose={sidebar.onClose}
        showDestinations
        onSelectLocation={handleSelectLocation}
        selectedName={selected.name}
      />

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 px-4 pb-4 pt-3",
          sidebar.open && "lg:left-[392px]"
        )}
      >
        <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
              <MapPin className="h-5 w-5 text-pink-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Ta loc actuelle
              </p>
              <p className="truncate text-base font-semibold text-zinc-900">
                {selected.name}
              </p>
              {lastSyncedLabel && (
                <p className="mt-0.5 text-xs text-zinc-400">
                  Sync {lastSyncedLabel}
                </p>
              )}
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide lg:hidden",
                active
                  ? "bg-pink-500/10 text-pink-600"
                  : "bg-zinc-100 text-zinc-500"
              )}
            >
              {active ? "Actif" : "Pause"}
            </span>
          </div>

          <Button className="mt-4 w-full" onClick={sidebar.onOpen}>
            <MapPin className="h-4 w-4" />
            Changer ma loc
          </Button>
        </div>
      </div>
    </div>
  );
}
