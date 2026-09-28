"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Heart,
  Loader2,
  MapPin,
  Monitor,
  Share,
  Square,
  User,
  X,
} from "lucide-react";
import { LocationSearch } from "@/components/dashboard/location-search";
import { useLocationSync } from "@/hooks/use-location-sync";
import { DESTINATION_SPOTS } from "@/lib/destination-spots";
import { DEFAULT_LOCATION } from "@/lib/location";
import { cn } from "@/lib/utils";

const LocationMap = dynamic(
  () => import("@/components/dashboard/location-map"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-500">
        Chargement de la carte...
      </div>
    ),
  }
);

type Place = { name: string; lat: number; lng: number };

const FAVORITES_KEY = "anyloc.remote.favorites";
const HOME_HINT_DISMISSED_KEY = "anyloc.remote.homeHintDismissed";
const POLL_INTERVAL_MS = 15_000;

function readFavorites(): Place[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites: Place[]) {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {}
}

const noopSubscribe = () => () => {};

function readHomeHintDismissed() {
  try {
    return window.localStorage.getItem(HOME_HINT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function isIosSafariBrowser() {
  const ua = navigator.userAgent;
  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
}

function AddToHomeScreenHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="pointer-events-auto rounded-2xl border border-pink-200 bg-white/95 p-3 shadow-lg backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
          <Share className="h-4 w-4 text-pink-600" />
        </div>
        <p className="flex-1 text-xs leading-relaxed text-zinc-700">
          <strong>Ajoute Anyloc à ton écran d&apos;accueil</strong> : touche{" "}
          <strong>Partager</strong> en bas de Safari, puis{" "}
          <strong>Sur l&apos;écran d&apos;accueil</strong>. Tu l&apos;ouvriras
          comme une app.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Masquer"
          className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function RemoteView() {
  const { location, loading, saving, error, saveLocation } = useLocationSync({
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  const [selected, setSelected] = useState<Place>({
    name: DEFAULT_LOCATION.name,
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
  });
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  // null = not touched yet in this session: read what localStorage holds.
  const [storedFavorites, setFavorites] = useState<Place[] | null>(null);
  const [homeHintDismissed, setHomeHintDismissed] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(
    null
  );
  const hydratedRef = useRef(false);

  const isActive = location?.isActive ?? false;

  const favorites = storedFavorites ?? (isClient ? readFavorites() : []);
  const showHomeHint =
    isClient &&
    !homeHintDismissed &&
    !readHomeHintDismissed() &&
    isIosSafariBrowser();

  // Start from the position already saved on the account (set from the
  // computer or another device), then let the user pick a new one.
  useEffect(() => {
    if (!location || hydratedRef.current) {
      return;
    }

    hydratedRef.current = true;
    setSelected({ name: location.name, lat: location.lat, lng: location.lng });
  }, [location]);

  const flash = useCallback((text: string, isError = false) => {
    setStatus({ text, error: isError });
    if (!isError) {
      window.setTimeout(() => setStatus(null), 3500);
    }
  }, []);

  const teleport = useCallback(
    async (place: Place = selected) => {
      setSelected(place);
      try {
        await saveLocation({
          name: place.name,
          lat: place.lat,
          lng: place.lng,
          isActive: true,
        });
        flash(`Position envoyée : ${place.name}`);
      } catch {
        // error is surfaced by useLocationSync
      }
    },
    [saveLocation, selected, flash]
  );

  const stop = useCallback(async () => {
    try {
      await saveLocation({
        name: selected.name,
        lat: selected.lat,
        lng: selected.lng,
        isActive: false,
      });
      flash("GPS remis à ta vraie position.");
    } catch {
      // error is surfaced by useLocationSync
    }
  }, [saveLocation, selected, flash]);

  const toggleFavorite = useCallback(() => {
    setFavorites((stored) => {
      const current = stored ?? readFavorites();
      const exists = current.some(
        (fav) => fav.lat === selected.lat && fav.lng === selected.lng
      );
      const next = exists
        ? current.filter(
            (fav) => !(fav.lat === selected.lat && fav.lng === selected.lng)
          )
        : [selected, ...current].slice(0, 20);
      writeFavorites(next);
      return next;
    });
  }, [selected]);

  const dismissHomeHint = useCallback(() => {
    setHomeHintDismissed(true);
    try {
      window.localStorage.setItem(HOME_HINT_DISMISSED_KEY, "1");
    } catch {}
  }, []);

  const shownStatus = error ? { text: error, error: true } : status;

  const isFavorite = favorites.some(
    (fav) => fav.lat === selected.lat && fav.lng === selected.lng
  );
  const isSelectedLive =
    isActive &&
    location != null &&
    location.lat === selected.lat &&
    location.lng === selected.lng;

  const quickPicks: Place[] = [
    ...favorites,
    ...DESTINATION_SPOTS.filter(
      (spot) =>
        !favorites.some((fav) => fav.lat === spot.lat && fav.lng === spot.lng)
    ).map((spot) => ({
      name: spot.emoji ? `${spot.emoji} ${spot.name}` : spot.name,
      lat: spot.lat,
      lng: spot.lng,
    })),
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-zinc-100">
      {/* Pinch-to-zoom on phones; Leaflet's +/- would sit under the search bar. */}
      <div className="absolute inset-0 [&_.leaflet-control-zoom]:hidden">
        <LocationMap
          selected={selected}
          onSelect={setSelected}
          active={isSelectedLive}
          fullScreen
        />
      </div>

      <div className="pointer-events-none relative z-[1000] flex flex-col gap-2 px-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <LocationSearch variant="top" onSelect={setSelected} />
          </div>
          <Link
            href="/dashboard?tab=account"
            aria-label="Mon compte"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/95 text-zinc-600 shadow-lg backdrop-blur-md"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
        {showHomeHint ? <AddToHomeScreenHint onDismiss={dismissHomeHint} /> : null}
      </div>

      <div className="relative z-[1000] mt-auto px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isActive ? "bg-emerald-500" : "bg-zinc-300"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isActive ? "text-emerald-600" : "text-zinc-500"
                  )}
                >
                  {loading
                    ? "Chargement…"
                    : isActive
                      ? `Actif · ${location?.name ?? ""}`
                      : "GPS réel"}
                </span>
              </div>
              <p className="mt-1 truncate text-lg font-bold text-zinc-900">
                {selected.name}
              </p>
              <p className="font-mono text-[11px] text-zinc-500">
                {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleFavorite}
              aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100"
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isFavorite ? "fill-pink-500 text-pink-500" : "text-zinc-500"
                )}
              />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void teleport()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 py-3.5 text-sm font-semibold text-white shadow-md disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {isSelectedLive ? "Position active" : isActive ? "Mettre à jour" : "Téléporter"}
            </button>
            {isActive ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void stop()}
                className="flex items-center gap-1.5 rounded-2xl bg-red-50 px-4 text-sm font-semibold text-red-600 disabled:opacity-60"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop
              </button>
            ) : null}
          </div>

          {shownStatus ? (
            <p
              className={cn(
                "mt-2 rounded-lg px-3 py-2 text-xs font-medium",
                shownStatus.error
                  ? "bg-red-50 text-red-700"
                  : "bg-emerald-50 text-emerald-700"
              )}
            >
              {shownStatus.text}
            </p>
          ) : null}

          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {quickPicks.map((place) => (
              <button
                key={`${place.lat},${place.lng}`}
                type="button"
                onClick={() => setSelected(place)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                  place.lat === selected.lat && place.lng === selected.lng
                    ? "border-pink-300 bg-pink-50 text-pink-700"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
                )}
              >
                {place.name}
              </button>
            ))}
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Monitor className="h-3 w-3" />
            Ton ordi applique la position tant que l&apos;iPhone est branché.
          </p>
        </div>
      </div>
    </div>
  );
}
