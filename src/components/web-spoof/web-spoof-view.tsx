"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Globe, Loader2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { installGeolocationSpoof } from "@/lib/geolocation-spoof";
import { useLocationSync } from "@/hooks/use-location-sync";

export function WebSpoofView() {
  const { location, loading, error, reload } = useLocationSync({
    pollIntervalMs: 5000,
  });
  const [enabled, setEnabled] = useState(false);
  const coordsRef = useRef<{ lat: number; lng: number; accuracy: number } | null>(
    null
  );

  useEffect(() => {
    if (location?.isActive) {
      coordsRef.current = {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
      };
      return;
    }

    coordsRef.current = null;
  }, [location]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const uninstall = installGeolocationSpoof(() => coordsRef.current);
    return uninstall;
  }, [enabled]);

  const canEnable = Boolean(location?.isActive);

  return (
    <div className="mx-auto max-w-3xl px-4 py-28 sm:px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/10">
          <Globe className="h-7 w-7 text-pink-600" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-900">Web Spoofing</h1>
        <p className="mt-3 text-sm text-zinc-600 sm:text-base">
          Active le spoofing GPS dans ce navigateur pour Snapchat Web, Insta Web
          et toutes les apps qui lisent <code>navigator.geolocation</code>.
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600">Position serveur</p>
            {loading ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </p>
            ) : location ? (
              <>
                <p className="mt-2 text-lg font-semibold text-zinc-900">
                  {location.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  {location.mode === "route" && location.routeProgress !== null
                    ? ` · trajet ${Math.round(location.routeProgress * 100)}%`
                    : ""}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                Connecte-toi pour charger ta position.
              </p>
            )}
          </div>

          <Button
            disabled={!canEnable}
            variant={enabled ? "secondary" : "default"}
            onClick={() => setEnabled((current) => !current)}
          >
            <Power className="h-4 w-4" />
            {enabled ? "Désactiver le spoof" : "Activer le spoof web"}
          </Button>
        </div>

        {!canEnable && !loading && (
          <p className="mt-4 text-sm text-amber-700">
            Active d&apos;abord ton signal depuis le{" "}
            <Link href="/dashboard" className="underline">
              dashboard
            </Link>
            .
          </p>
        )}

        {enabled && canEnable && (
          <p className="mt-4 text-sm text-emerald-700">
            Spoof actif dans cet onglet — ouvre Snapchat Web ou une autre app web
            ici pour utiliser ta fausse position.
          </p>
        )}
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-semibold text-zinc-900">Comment l&apos;utiliser</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
          <li>Choisis ta ville sur le dashboard et active le signal.</li>
          <li>Reviens ici et clique sur « Activer le spoof web ».</li>
          <li>
            Ouvre Snapchat Web / Insta Web dans le même navigateur (nouvel onglet
            OK si tu restes connecté).
          </li>
          <li>
            Sur iPhone : ajoute anyloc.io à ton écran d&apos;accueil pour un mode
            app dédié.
          </li>
        </ol>
        <div className="mt-4 flex gap-3">
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">Dashboard</Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            Rafraîchir
          </Button>
        </div>
      </Card>
    </div>
  );
}
