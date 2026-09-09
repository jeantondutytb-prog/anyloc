"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMenu } from "@/components/dashboard/dashboard-menu";
import { DestinationSidebar } from "@/components/dashboard/destination-sidebar";
import {
  LocationSearch,
  type LocationSearchHandle,
} from "@/components/dashboard/location-search";
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
        await saveLocation({
          name: nextLocation.name,
          lat: nextLocation.lat,
          lng: nextLocation.lng,
          isActive,
        });
      } catch {
        setActive(false);
      }
    },
    [saveLocation]
  );

  const handlePreviewLocation = useCallback(
    (nextLocation: { name: string; lat: number; lng: number }) => {
      setSelected(nextLocation);

      if (active) {
        void persistLocation(nextLocation, true);
      }
    },
    [active, persistLocation]
  );

  const handleSelectFromSearch = useCallback(
    async (nextLocation: { name: string; lat: number; lng: number }) => {
      await persistLocation(nextLocation, true);
    },
    [persistLocation]
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

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <DestinationSidebar
        selectedName={selected.name}
        onSelect={handlePreviewLocation}
      />

      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-x-0 top-0 z-20 px-4 pt-3 lg:pt-4">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <DashboardMenu />
            <div className="min-w-0 flex-1">
              <LocationSearch
                ref={locationSearchRef}
                variant="top"
                onSelect={handleSelectFromSearch}
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
            onSelect={handlePreviewLocation}
            active={active}
            fullScreen
          />
        </div>

        {error && (
          <div className="absolute left-4 right-4 top-20 z-20 rounded-xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-700 shadow-sm backdrop-blur-sm sm:top-16 sm:max-w-sm">
            {error}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 pt-3">
          <div className="mx-auto max-w-3xl">
            <Button
              className="w-full"
              variant={active ? "secondary" : "default"}
              onClick={() => void handleToggleLocation()}
              disabled={saving}
            >
              {active ? (
                <>
                  <MapPinOff className="h-4 w-4" />
                  Arrêter de fake ma loc
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" />
                  Changer ma loc
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
