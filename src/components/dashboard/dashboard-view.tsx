"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  MapPin,
  Navigation,
  Power,
  Route,
  Settings,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { InstallPrompt } from "@/components/dashboard/install-prompt";
import { LocationSearch } from "@/components/dashboard/location-search";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { useDashboardOnboarding } from "@/hooks/use-dashboard-onboarding";
import { SAVED_LOCATIONS } from "@/lib/constants";

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

const DEFAULT_LOCATION = {
  name: "Marbella — Puerto Banús",
  lat: 36.4848,
  lng: -4.9526,
};

export function DashboardView() {
  const {
    hydrated,
    state,
    showWelcome,
    paymentSuccess,
    dismissWelcome,
    completeStep,
    showChecklist,
    showMap,
  } = useDashboardOnboarding();

  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState(DEFAULT_LOCATION);
  const initialLocationRef = useRef(DEFAULT_LOCATION);

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

  useEffect(() => {
    if (active) {
      completeStep("activate");
    }
  }, [active, completeStep]);

  const handleSendPosition = () => {
    completeStep("sendPosition");
  };

  const handleSelectLocation = (location: {
    name: string;
    lat: number;
    lng: number;
  }) => {
    setSelected(location);
  };

  const handleToggleActive = () => {
    setActive((current) => !current);
  };

  const handleStartGuide = () => {
    dismissWelcome();
  };

  const handleSkipGuide = () => {
    completeStep("install");
    dismissWelcome();
  };

  const handleMarkInstallComplete = () => {
    completeStep("install");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <DashboardWelcome
        open={showWelcome}
        paymentSuccess={paymentSuccess}
        onStart={handleStartGuide}
        onSkip={handleSkipGuide}
      />

      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-zinc-200 bg-logo-background px-4 lg:hidden">
        <Logo />
      </header>

      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-logo-background p-4 lg:block">
        <Logo className="px-2 py-4" />

        <nav className="mt-4 space-y-1">
          {[
            { icon: MapPin, label: "Carte", active: true },
            { icon: Route, label: "Routes", href: "#" },
            { icon: Bookmark, label: "Favoris", href: "#" },
            { icon: Smartphone, label: "Mes appareils", href: "/setup/ios" },
            { icon: Settings, label: "Paramètres", href: "/dashboard/settings" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href || "#"}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                item.active
                  ? "bg-pink-500/10 text-pink-600"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {paymentSuccess && hydrated && !showWelcome && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Paiement confirmé — ton accès Anyloc est actif. Suis le guide ci-dessous
            pour envoyer ta première position.
          </div>
        )}

        {showChecklist && (
          <div className="mb-6">
            <OnboardingChecklist
              steps={state.steps}
              onMarkInstallComplete={handleMarkInstallComplete}
            />
          </div>
        )}

        {!showMap ? (
          <InstallPrompt onMarkComplete={handleMarkInstallComplete} />
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
                <p className="text-sm text-zinc-500">
                  Choisis un spot et active ton signal GPS
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                    active
                      ? "bg-pink-500/10 text-pink-600"
                      : "bg-zinc-500/10 text-zinc-500"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      active ? "bg-pink-500 animate-pulse" : "bg-zinc-400"
                    }`}
                  />
                  {active ? "Signal actif" : "En pause"}
                </span>
                <Button
                  variant={active ? "secondary" : "default"}
                  onClick={handleToggleActive}
                >
                  <Power className="h-4 w-4" />
                  {active ? "Arrêter" : "Activer"}
                </Button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <LocationSearch onSelect={handleSelectLocation} />

                <Card className="overflow-hidden border-zinc-200 bg-white p-0">
                  <LocationMap
                    selected={selected}
                    onSelect={handleSelectLocation}
                    active={active}
                  />
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="p-5">
                  <h3 className="text-sm font-medium text-zinc-600">
                    Loc sélectionnée
                  </h3>
                  <p className="mt-2 text-lg font-semibold text-zinc-900">
                    📍 {selected.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
                  </p>
                  <Button
                    className="mt-4 w-full"
                    disabled={!active}
                    onClick={handleSendPosition}
                  >
                    <Navigation className="h-4 w-4" />
                    Envoyer cette position
                  </Button>
                  {!active && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Active le signal en haut à droite pour débloquer l&apos;envoi.
                    </p>
                  )}
                </Card>

                <Card className="p-5">
                  <h3 className="text-sm font-medium text-zinc-600">
                    Spots rapides
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {SAVED_LOCATIONS.map((loc) => (
                      <li key={loc.name}>
                        <button
                          type="button"
                          onClick={() => handleSelectLocation(loc)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-pink-600/60" />
                          {loc.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-5">
                  <h3 className="text-sm font-medium text-zinc-600">
                    Branche ton tel
                  </h3>
                  <p className="mt-2 text-sm text-zinc-500">
                    L&apos;app Anyloc doit être installée sur ton mobile pour
                    envoyer la loc choisie.
                  </p>
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
          </>
        )}
      </main>
    </div>
  );
}
