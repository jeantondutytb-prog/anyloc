"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  MapPin,
  Navigation,
  Power,
  Smartphone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DestinationPanel } from "@/components/dashboard/destination-panel";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
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
  const { hydrated, state, completeStep, isComplete } = useDashboardOnboarding();

  const { location, loading, saving, error, saveLocation } = useLocationSync({
    onSynced: () => completeStep("activate"),
  });

  const [active, setActive] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(true);
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

  const persistLocation = useCallback(
    async (nextActive: boolean) => {
      await saveLocation({
        name: selected.name,
        lat: selected.lat,
        lng: selected.lng,
        isActive: nextActive,
      });
    },
    [saveLocation, selected]
  );

  const handleActivateSignal = async () => {
    setActive(true);
    await persistLocation(true);
  };

  const handleStopSignal = async () => {
    setActive(false);

    try {
      await persistLocation(false);
    } catch {
      setActive(true);
    }
  };

  const handleSelectLocation = (nextLocation: {
    name: string;
    lat: number;
    lng: number;
  }) => {
    setSelected(nextLocation);
  };

  const lastSyncedLabel = location?.updatedAt
    ? new Date(location.updatedAt).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  const showOnboarding = hydrated && !isComplete && showOnboardingBanner;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <DashboardNav />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 py-3 lg:hidden">
          <Logo />
          <Link
            href="/dashboard/installation"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-md backdrop-blur-sm"
            aria-label="Guide d'installation"
          >
            <Smartphone className="h-4 w-4" />
          </Link>
        </header>

        <div className="absolute inset-0 z-0">
          <LocationMap
            selected={selected}
            onSelect={handleSelectLocation}
            active={active}
            fullScreen
            layoutKey={panelOpen ? 1 : 0}
          />
        </div>

        {error && (
          <div className="absolute left-4 right-4 top-16 z-20 rounded-xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-700 shadow-sm backdrop-blur-sm lg:top-4 lg:left-auto lg:right-[calc(380px+1rem)] lg:max-w-sm">
            {error}
          </div>
        )}

        {showOnboarding && (
          <div className="absolute left-4 right-4 top-16 z-20 max-h-[40vh] overflow-y-auto lg:top-4 lg:max-w-md">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOnboardingBanner(false)}
                className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm hover:bg-zinc-100"
                aria-label="Masquer le guide"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <OnboardingChecklist
                steps={state.steps}
                onMarkInstallComplete={() => completeStep("install")}
              />
            </div>
          </div>
        )}

        <div
          className={cn(
            "absolute left-4 top-4 z-10 hidden items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur-sm lg:flex",
            active ? "text-pink-600" : "text-zinc-500"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              active ? "bg-pink-500 animate-pulse" : "bg-zinc-400"
            )}
          />
          {active ? "Signal actif" : "Signal en pause"}
        </div>

        {!panelOpen && (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="absolute right-0 top-1/2 z-20 hidden -translate-y-1/2 lg:flex"
            aria-label="Ouvrir les destinations"
          >
            <span className="flex h-14 w-7 items-center justify-center rounded-l-2xl border border-r-0 border-zinc-200 bg-white/95 text-zinc-500 shadow-lg backdrop-blur-sm transition-colors hover:bg-white hover:text-pink-600">
              <ChevronLeft className="h-4 w-4" />
            </span>
          </button>
        )}

        <DestinationPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onSelect={handleSelectLocation}
          selectedName={selected.name}
        />

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 px-4 pb-20 pt-3 lg:pb-4",
            panelOpen && "lg:right-[380px]"
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

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setPanelOpen(true)}
              >
                <MapPin className="h-4 w-4" />
                Changer ma loc
              </Button>
              {active ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={saving || loading}
                  onClick={() => void handleStopSignal()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  Arrêter
                </Button>
              ) : (
                <Button
                  className="w-full"
                  disabled={saving || loading}
                  onClick={() => void handleActivateSignal()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  Activer le signal
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <DashboardNav mobile />
    </div>
  );
}
