"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import {
  DashboardSidebar,
  DashboardSidebarToggle,
  useDashboardSidebar,
} from "@/components/dashboard/dashboard-sidebar";
import { useLocationSync } from "@/hooks/use-location-sync";
import { SAVED_LOCATIONS } from "@/lib/constants";
import type { Waypoint } from "@/lib/route-simulation";
import { cn } from "@/lib/utils";

const RouteMap = dynamic(() => import("@/components/dashboard/route-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-xl bg-zinc-50 text-zinc-500">
      Chargement de la carte...
    </div>
  ),
});

export function RoutesView() {
  const sidebar = useDashboardSidebar();
  const { location, loading, saving, error, saveLocation, reload } =
    useLocationSync({ pollIntervalMs: 5000 });

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeName, setRouteName] = useState("Mon trajet");
  const [speedKmh, setSpeedKmh] = useState(50);

  const handleAddWaypoint = (waypoint: Waypoint) => {
    setWaypoints((current) => [...current, waypoint]);
  };

  const handleClear = () => {
    setWaypoints([]);
  };

  const handleQuickRoute = (from: Waypoint, to: Waypoint, name: string) => {
    setRouteName(name);
    setWaypoints([from, to]);
  };

  const handleStartRoute = async () => {
    if (waypoints.length < 2) {
      return;
    }

    await saveLocation({
      mode: "route",
      name: routeName,
      lat: waypoints[0].lat,
      lng: waypoints[0].lng,
      waypoints,
      speedKmh,
      isActive: true,
      resetRoute: true,
    });
  };

  const handleStopRoute = async () => {
    await saveLocation({
      mode: "route",
      name: routeName,
      lat: waypoints[0]?.lat ?? 0,
      lng: waypoints[0]?.lng ?? 0,
      waypoints,
      speedKmh,
      isActive: false,
    });
  };

  const activeRoute = location?.mode === "route" && location.isActive;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-logo-background px-4 py-4 lg:hidden">
        <Logo />
      </header>

      <DashboardSidebarToggle open={sidebar.open} onOpen={sidebar.onOpen} />
      <DashboardSidebar open={sidebar.open} onClose={sidebar.onClose} />

      <main
        className={cn(
          "mx-auto max-w-5xl px-4 py-8 sm:px-6",
          sidebar.open && "lg:ml-[392px]"
        )}
      >
        <h1 className="text-2xl font-bold text-zinc-900">Trajets simulés</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Trace un parcours crédible entre deux points. Ta position avance
          automatiquement sur la route — visible sur tes apps et en web spoofing.
        </p>

        {error && (
          <Card className="mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </Card>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <RouteMap waypoints={waypoints} onAddWaypoint={handleAddWaypoint} />
            <p className="text-xs text-zinc-500">
              Clique sur la carte pour ajouter des points. Minimum 2 points pour
              lancer un trajet.
            </p>
          </div>

          <div className="space-y-4">
            <Card className="p-5">
              <label className="text-sm font-medium text-zinc-600">
                Nom du trajet
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={routeName}
                onChange={(event) => setRouteName(event.target.value)}
              />

              <label className="mt-4 block text-sm font-medium text-zinc-600">
                Vitesse (km/h)
              </label>
              <input
                type="number"
                min={5}
                max={200}
                className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={speedKmh}
                onChange={(event) => setSpeedKmh(Number(event.target.value))}
              />

              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1"
                  disabled={waypoints.length < 2 || saving}
                  onClick={() => void handleStartRoute()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Lancer
                </Button>
                <Button
                  variant="secondary"
                  disabled={saving || !activeRoute}
                  onClick={() => void handleStopRoute()}
                >
                  Pause
                </Button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                onClick={handleClear}
              >
                <Trash2 className="h-4 w-4" />
                Effacer les points
              </Button>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-medium text-zinc-600">Trajets rapides</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-100"
                    onClick={() =>
                      handleQuickRoute(
                        { name: "Marbella", lat: 36.4848, lng: -4.9526 },
                        { name: "Valencia", lat: 39.4549, lng: -0.3523 },
                        "Marbella → Valencia"
                      )
                    }
                  >
                    <MapPin className="h-3.5 w-3.5 text-pink-600/60" />
                    Marbella → Valencia
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-100"
                    onClick={() =>
                      handleQuickRoute(
                        SAVED_LOCATIONS[0],
                        SAVED_LOCATIONS[1],
                        "Marbella → Ibiza"
                      )
                    }
                  >
                    <MapPin className="h-3.5 w-3.5 text-pink-600/60" />
                    Marbella → Ibiza
                  </button>
                </li>
              </ul>
            </Card>

            {location && (
              <Card className="p-5">
                <h3 className="text-sm font-medium text-zinc-600">Position live</h3>
                <p className="mt-2 text-sm text-zinc-900">{location.name}</p>
                <p className="text-xs text-zinc-500">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
                {location.mode === "route" && location.routeProgress !== null && (
                  <p className="mt-2 text-xs text-pink-600">
                    Progression : {Math.round(location.routeProgress * 100)}%
                  </p>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => void reload()}
                  disabled={loading}
                >
                  Rafraîchir
                </Button>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
