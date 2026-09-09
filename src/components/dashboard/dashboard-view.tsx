"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMenu } from "@/components/dashboard/dashboard-menu";
import { DashboardPhoneSetup } from "@/components/dashboard/dashboard-phone-setup";
import { DestinationSheet } from "@/components/dashboard/destination-sheet";
import { LocationSearch } from "@/components/dashboard/location-search";
import { useDashboardOnboarding } from "@/hooks/use-dashboard-onboarding";
import { useDeviceStatus } from "@/hooks/use-device-status";
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
  const {
    devices,
    phoneOnline,
    hasLinkedDevice,
    reload: reloadDevices,
  } = useDeviceStatus();

  const { location, error, saving, saveLocation } = useLocationSync({
    onSynced: () => completeStep("activate"),
  });

  const [active, setActive] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
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

  const handleStopLocation = useCallback(async () => {
    setActive(false);

    try {
      await saveLocation({
        name: selected.name,
        lat: selected.lat,
        lng: selected.lng,
        isActive: false,
      });
    } catch {
      setActive(location?.isActive ?? false);
    }
  }, [location?.isActive, saveLocation, selected]);

  const handleDeviceLinked = useCallback(() => {
    completeStep("install");
    void reloadDevices();
  }, [completeStep, reloadDevices]);

  useEffect(() => {
    if (hasLinkedDevice) {
      completeStep("install");
    }
  }, [completeStep, hasLinkedDevice]);

  const lastSyncedLabel = location?.updatedAt
    ? new Date(location.updatedAt).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  const canPickLocation = phoneOnline;
  const statusLabel = active
    ? phoneOnline
      ? "GPS actif sur ton téléphone"
      : "Position enregistrée · en attente du tel"
    : phoneOnline
      ? "Prêt · choisis une ville"
      : "Connecte ton téléphone d'abord";

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 z-20 px-4 pt-3 lg:pt-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <DashboardMenu />
          <div className="min-w-0 flex-1">
            <LocationSearch
              variant="top"
              onSelect={handleSelectLocation}
              disabled={!canPickLocation}
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
          onSelect={canPickLocation ? handleSelectLocation : () => {}}
          active={active}
          fullScreen
          layoutKey={sheetOpen ? 1 : 0}
        />
      </div>

      {!canPickLocation && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-zinc-900/10 backdrop-blur-[1px]" />
      )}

      {error && (
        <div className="absolute left-4 right-4 top-20 z-20 rounded-xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-700 shadow-sm backdrop-blur-sm sm:top-16 sm:max-w-sm">
          {error}
        </div>
      )}

      <DestinationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelect={handleSelectLocation}
        selectedName={selected.name}
      />

      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 pt-3">
        <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md">
          {!phoneOnline ? (
            <DashboardPhoneSetup
              devices={devices}
              phoneOnline={phoneOnline}
              onLinked={handleDeviceLinked}
              compact
            />
          ) : (
            <>
              <div className="flex items-start gap-3">
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
                      Sync {lastSyncedLabel}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide sm:hidden",
                    active
                      ? "bg-pink-500/10 text-pink-600"
                      : "bg-zinc-100 text-zinc-500"
                  )}
                >
                  {active ? "Actif" : "Pause"}
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {active ? (
                  <>
                    <Button
                      variant="secondary"
                      className="flex-1 border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50"
                      disabled={saving}
                      onClick={() => void handleStopLocation()}
                    >
                      <Square className="h-4 w-4 fill-current" />
                      Arrêter la loc
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={saving}
                      onClick={() => setSheetOpen(true)}
                    >
                      <MapPin className="h-4 w-4" />
                      Changer de ville
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="mb-1 text-sm text-zinc-600 sm:hidden">
                      Cherche une ville ou tape sur la carte pour activer ta loc.
                    </p>
                    <Button
                      className="flex-1"
                      onClick={() => setSheetOpen(true)}
                    >
                      <MapPin className="h-4 w-4" />
                      Choisir une destination
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
