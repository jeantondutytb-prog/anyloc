"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMenu } from "@/components/dashboard/dashboard-menu";
import { DashboardPhoneSetup } from "@/components/dashboard/dashboard-phone-setup";
import { DestinationSidebar } from "@/components/dashboard/destination-sidebar";
import {
  LocationSearch,
  type LocationSearchHandle,
} from "@/components/dashboard/location-search";
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

  const { location, error, saveLocation, saving } = useLocationSync({
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
  const locationSearchRef = useRef<LocationSearchHandle>(null);

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
    async (
      nextLocation: { name: string; lat: number; lng: number },
      isActive: boolean
    ) => {
      setSelected(nextLocation);
      setActive(isActive);

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
    [saveLocation]
  );

  const handleSelectLocation = useCallback(
    async (nextLocation: { name: string; lat: number; lng: number }) => {
      if (!phoneOnline) {
        return;
      }

      await persistLocation(nextLocation, true);
    },
    [persistLocation, phoneOnline]
  );


  const handleToggleLocation = useCallback(async () => {
    if (active) {
      await persistLocation(selected, false);
      return;
    }

    if (!phoneOnline) {
      return;
    }

    if (locationSearchRef.current?.hasQuery()) {
      await locationSearchRef.current.submitQuery();
      return;
    }

    await persistLocation(selected, true);
  }, [active, persistLocation, phoneOnline, selected]);

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
      ? "Ta fausse position est allumée sur ton téléphone"
      : "Position enregistrée — ouvre l'app Anyloc sur ton tel"
    : phoneOnline
      ? "Choisis où tu veux apparaître"
      : "Commence par installer l'app sur ton téléphone (en bas)";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <DestinationSidebar
        selectedName={selected.name}
            onSelect={handleSelectLocation}
        disabled={!canPickLocation}
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
            onSelect={handleSelectLocation}
            active={active}
            fullScreen
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

        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 pt-3">
          <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md">
            {!phoneOnline ? (
              <DashboardPhoneSetup
                devices={devices}
                phoneOnline={phoneOnline}
                onLinked={handleDeviceLinked}
                compact
              />
            ) : (
              <>
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
                  disabled={saving || !phoneOnline}
                >
                  {active ? (
                    <>
                      <MapPinOff className="h-4 w-4" />
                      Arrêter — revenir à ma vraie position
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      Clique une ville à gauche pour t&apos;y téléporter
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
