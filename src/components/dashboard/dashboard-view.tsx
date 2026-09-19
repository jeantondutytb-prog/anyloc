"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMenu } from "@/components/dashboard/dashboard-menu";
import { DestinationSidebar } from "@/components/dashboard/destination-sidebar";
import {
  LocationSearch,
  type LocationSearchHandle,
} from "@/components/dashboard/location-search";
import {
  WebGpsShortcutBar,
  WebSetupWizard,
} from "@/components/dashboard/web-setup-wizard";
import { useDashboardOnboarding } from "@/hooks/use-dashboard-onboarding";
import { useLocationSync } from "@/hooks/use-location-sync";
import { useWebSetup } from "@/hooks/use-web-setup";
import { DESTINATION_SPOTS } from "@/lib/destination-spots";
import { installGeolocationSpoof } from "@/lib/geolocation-spoof";
import { DEFAULT_LOCATION } from "@/lib/location";
import { cn } from "@/lib/utils";
import { buildWebSpoofBookmarklet } from "@/lib/web-spoof-bookmarklet";
import { readWebSpoofToken } from "@/lib/web-setup";

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

type DashboardViewProps = {
  preview?: boolean;
  paymentSuccess?: boolean;
  forceSetup?: boolean;
  onSetupComplete?: () => void;
};

export function DashboardView({
  preview = false,
  paymentSuccess = false,
  forceSetup = false,
  onSetupComplete,
}: DashboardViewProps) {
  const { completeStep } = useDashboardOnboarding();
  const {
    hydrated: setupHydrated,
    completeStep: completeSetupStep,
    completeSetup,
    isComplete: setupComplete,
  } = useWebSetup({ preview });

  const { location, error, saveLocation, saving } = useLocationSync({
    onSynced: () => completeStep("activate"),
  });

  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState({
    name: DEFAULT_LOCATION.name,
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
  });
  const [copiedShortcut, setCopiedShortcut] = useState(false);
  const initialLocationRef = useRef(selected);
  const hasHydratedLocationRef = useRef(false);
  const locationSearchRef = useRef<LocationSearchHandle>(null);
  const coordsRef = useRef<{ lat: number; lng: number; accuracy: number } | null>(
    null
  );

  const wizardOpen = setupHydrated && (forceSetup || !setupComplete);

  useEffect(() => {
    if (preview) {
      hasHydratedLocationRef.current = true;
      return;
    }

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
  }, [completeStep, location, preview]);

  useEffect(() => {
    if (active) {
      coordsRef.current = {
        lat: selected.lat,
        lng: selected.lng,
        accuracy: location?.accuracy ?? DEFAULT_LOCATION.accuracy,
      };
      return;
    }

    coordsRef.current = null;
  }, [active, location?.accuracy, selected.lat, selected.lng]);

  useEffect(() => {
    const uninstall = installGeolocationSpoof(() => coordsRef.current);
    return uninstall;
  }, []);

  const persistLocation = useCallback(
    async (
      nextLocation: { name: string; lat: number; lng: number },
      isActive: boolean
    ) => {
      setSelected(nextLocation);
      setActive(isActive);

      if (preview) {
        completeStep("activate");
        return;
      }

      try {
        const saved = await saveLocation({
          name: nextLocation.name,
          lat: nextLocation.lat,
          lng: nextLocation.lng,
          isActive,
        });

        if (saved) {
          setSelected({
            name: saved.name,
            lat: saved.lat,
            lng: saved.lng,
          });
        }
      } catch {
        setActive(false);
      }
    },
    [completeStep, preview, saveLocation]
  );

  const handleSelectLocation = useCallback(
    async (nextLocation: { name: string; lat: number; lng: number }) => {
      await persistLocation(nextLocation, true);
      completeStep("chooseSpot");
    },
    [completeStep, persistLocation]
  );

  const handleToggleLocation = useCallback(async () => {
    if (active) {
      await persistLocation(selected, false);
      return;
    }

    if (locationSearchRef.current?.hasQuery()) {
      await locationSearchRef.current.submitQuery();
      return;
    }

    await persistLocation(selected, true);
  }, [active, persistLocation, selected]);

  const bookmarklet = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const token = preview ? "anyloc_preview" : readWebSpoofToken();
    if (!token) {
      return null;
    }

    return buildWebSpoofBookmarklet({
      origin: window.location.origin,
      token,
      lat: selected.lat,
      lng: selected.lng,
      accuracy: location?.accuracy ?? DEFAULT_LOCATION.accuracy,
      name: selected.name,
    });
  }, [location?.accuracy, preview, selected.lat, selected.lng, selected.name]);

  async function copyShortcut() {
    if (!bookmarklet) {
      return;
    }

    try {
      await navigator.clipboard.writeText(bookmarklet);
      setCopiedShortcut(true);
      window.setTimeout(() => setCopiedShortcut(false), 2500);
    } catch {
      setCopiedShortcut(false);
    }
  }

  const lastSyncedLabel = location?.updatedAt
    ? new Date(location.updatedAt).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  const statusLabel = active
    ? "Ta fausse position est allumée"
    : "Choisis où tu veux apparaître";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <WebSetupWizard
        open={wizardOpen}
        paymentSuccess={paymentSuccess}
        preview={preview}
        location={{
          name: selected.name,
          lat: selected.lat,
          lng: selected.lng,
          accuracy: location?.accuracy ?? DEFAULT_LOCATION.accuracy,
        }}
        onStepComplete={completeSetupStep}
        onComplete={() => {
          completeSetup();
          completeStep("install");
          onSetupComplete?.();
        }}
      />

      <DestinationSidebar
        className="hidden lg:flex"
        selectedName={selected.name}
        onSelect={handleSelectLocation}
      />

      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-x-0 top-0 z-20 px-4 pt-3 lg:pt-4">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <DashboardMenu />
            <div className="min-w-0 flex-1">
              <LocationSearch
                ref={locationSearchRef}
                variant="top"
                onSelect={handleSelectLocation}
              />
            </div>
            <div
              className={cn(
                "hidden shrink-0 items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-md sm:flex",
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

        <div className="absolute inset-0 z-0">
          <LocationMap
            selected={selected}
            onSelect={handleSelectLocation}
            active={active}
            fullScreen
          />
        </div>

        {error && !preview ? (
          <div className="absolute left-4 right-4 top-20 z-20 rounded-xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-700 shadow-sm backdrop-blur-sm sm:top-16 sm:max-w-sm">
            {error}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 pt-3">
          <div className="mx-auto max-w-3xl space-y-3">
            {active ? (
              <WebGpsShortcutBar
                bookmarklet={bookmarklet}
                copied={copiedShortcut}
                onCopy={() => void copyShortcut()}
              />
            ) : null}

            <div className="rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md">
              <div className="mb-3 lg:hidden">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-pink-600">
                  Destinations
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {DESTINATION_SPOTS.map((spot) => {
                    const isSelected = selected.name === spot.name;
                    return (
                      <button
                        key={spot.name}
                        type="button"
                        onClick={() => void handleSelectLocation(spot)}
                        className={cn(
                          "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          isSelected
                            ? "bg-pink-500 text-white shadow-sm"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        )}
                      >
                        {spot.emoji ? `${spot.emoji} ` : ""}
                        {spot.name.split(" — ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4 flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    active ? "bg-pink-500/10" : "bg-zinc-100"
                  )}
                >
                  <MapPin
                    className={cn(
                      "h-5 w-5",
                      active ? "text-pink-600" : "text-zinc-500"
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {statusLabel}
                  </p>
                  <p className="truncate text-base font-semibold text-zinc-900">
                    {selected.name}
                  </p>
                  {lastSyncedLabel && (
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Dernière mise à jour : {lastSyncedLabel}
                    </p>
                  )}
                </div>
              </div>

              <Button
                className="w-full"
                variant={active ? "secondary" : "default"}
                onClick={() => void handleToggleLocation()}
                disabled={saving}
              >
                {active ? (
                  <>
                    <MapPinOff className="h-4 w-4" />
                    Arrêter — revenir à ma vraie position
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    Clique une ville pour t&apos;y téléporter
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
