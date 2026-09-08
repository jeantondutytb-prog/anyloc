"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  MapPin,
  Navigation,
  Power,
  Search,
  Smartphone,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SAVED_LOCATIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LocationMap = dynamic(
  () => import("@/components/dashboard/location-map"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl bg-zinc-50 text-zinc-500">
        Chargement de la carte...
      </div>
    ),
  }
);

type Location = {
  name: string;
  lat: number;
  lng: number;
};

export default function DashboardPage() {
  const [active, setActive] = useState(false);
  const [sent, setSent] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Location>({
    name: "Marbella — Puerto Banús",
    lat: 36.4848,
    lng: -4.9526,
  });

  const filteredSpots = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return SAVED_LOCATIONS;

    return SAVED_LOCATIONS.filter((loc) =>
      loc.name.toLowerCase().includes(query)
    );
  }, [search]);

  function selectLocation(loc: Location) {
    setSelected(loc);
    setSent(false);
  }

  function handleSend() {
    if (!active) return;
    setSent(true);
  }

  function toggleActive() {
    setActive((value) => {
      if (value) setSent(false);
      return !value;
    });
  }

  return (
    <DashboardShell>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Abonnement actif · Annuel
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Choisis un spot sur la carte et active ton signal GPS
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                active
                  ? "bg-emerald-500/10 text-emerald-700"
                  : "bg-zinc-500/10 text-zinc-500"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  active ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                )}
              />
              {active ? "Signal actif" : "En pause"}
            </span>
            <Button
              variant={active ? "secondary" : "default"}
              onClick={toggleActive}
            >
              <Power className="h-4 w-4" />
              {active ? "Arrêter" : "Activer"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Recherche une ville ou un lieu…"
                className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/50"
              />
            </div>

            <Card className="overflow-hidden border-zinc-800 bg-zinc-950 p-0">
              <LocationMap
                selected={selected}
                onSelect={selectLocation}
                active={active}
              />
            </Card>

            {search && filteredSpots.length > 0 && (
              <Card className="p-3">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Résultats
                </p>
                <ul className="space-y-1">
                  {filteredSpots.map((loc) => (
                    <li key={loc.name}>
                      <button
                        type="button"
                        onClick={() => {
                          selectLocation(loc);
                          setSearch("");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-pink-600/60" />
                        {loc.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card
              className={cn(
                "p-5 transition-colors",
                active && "border-pink-200 bg-pink-50/30"
              )}
            >
              <h3 className="text-sm font-semibold text-zinc-600">
                {active ? "Spot actif" : "Loc sélectionnée"}
              </h3>
              <p className="mt-2 text-lg font-bold text-zinc-900">
                📍 {selected.name}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
              </p>

              {sent ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Position envoyée sur ton mobile !
                </div>
              ) : (
                <Button
                  className="mt-4 w-full"
                  disabled={!active}
                  onClick={handleSend}
                >
                  <Navigation className="h-4 w-4" />
                  Envoyer cette position
                </Button>
              )}

              {!active && (
                <p className="mt-3 text-xs text-zinc-500">
                  Active le signal pour envoyer la position à ton téléphone.
                </p>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-zinc-600">
                Spots rapides
              </h3>
              <ul className="mt-3 space-y-1">
                {SAVED_LOCATIONS.map((loc) => {
                  const isSelected = loc.name === selected.name;

                  return (
                    <li key={loc.name}>
                      <button
                        type="button"
                        onClick={() => selectLocation(loc)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          isSelected
                            ? "bg-pink-500/10 font-medium text-pink-700"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                        )}
                      >
                        <MapPin
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isSelected ? "text-pink-600" : "text-pink-600/60"
                          )}
                        />
                        {loc.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="border-pink-200 bg-gradient-to-br from-pink-50/80 to-violet-50/50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Smartphone className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900">
                    Branche ton tel
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    Installe l&apos;app Anyloc sur ton mobile pour recevoir la
                    position choisie.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link href="/setup/ios" className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">
                    iOS
                  </Button>
                </Link>
                <Link href="/setup/android" className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">
                    Android
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}
