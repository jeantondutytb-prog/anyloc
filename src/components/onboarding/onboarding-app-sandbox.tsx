"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bookmark,
  ChevronRight,
  Crosshair,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Navigation,
  Search,
  Settings,
  X,
} from "lucide-react";
import type { MapPoint } from "@/components/onboarding/onboarding-app-map";
import { APP_SPOT_CATEGORIES, APP_SPOTS, type AppSpot } from "@/lib/app-spots";
import type { GeocodeResult } from "@/lib/geocoding";
import {
  geocodeResultToOnboardingDestination,
  mergeOnboardingSearchResults,
  searchOnboardingDestinations,
  type OnboardingDestination,
} from "@/lib/onboarding-destinations";
import { cn } from "@/lib/utils";

// Working replica of the iOS app's home screen (apps/ios/Anyloc/MapHomeView.swift),
// limited to "Téléporter" and "Explorer". Everything works except actually
// moving the location: "Définir cette position" hands off to signup.

const OnboardingAppMap = dynamic(
  () => import("@/components/onboarding/onboarding-app-map"),
  { ssr: false, loading: () => <div className="h-full w-full bg-[#1b1b1f]" /> }
);

type Mode = "teleport" | "explore";
export type SelectionSource = "search" | "explore" | "map" | "restored";
export type LockedFeature = "favorites" | "settings";

const floatingCard =
  "rounded-[18px] border border-[#25252B] bg-[#0A0A0C]/[0.93] backdrop-blur-md";

function formatCoords(lat: number, lng: number) {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function spotToDestination(spot: AppSpot): OnboardingDestination {
  return {
    id: `spot-${spot.name}`,
    city: spot.name,
    area: spot.country,
    emoji: spot.emoji,
    lat: spot.lat,
    lng: spot.lng,
  };
}

/** Local destinations first, then the geocoding API (debounced). */
function useDestinationSearch(query: string) {
  const trimmed = query.trim();
  const isSearching = trimmed.length >= 2;
  const [remote, setRemote] = useState<{ query: string; results: GeocodeResult[] }>({
    query: "",
    results: [],
  });
  const [loadingQuery, setLoadingQuery] = useState<string | null>(null);

  useEffect(() => {
    if (!isSearching) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoadingQuery(trimmed);
      void fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((data: { results?: GeocodeResult[] }) => {
          setRemote({ query: trimmed, results: data.results ?? [] });
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setRemote({ query: trimmed, results: [] });
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoadingQuery(null);
          }
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isSearching, trimmed]);

  const results = useMemo(() => {
    if (!isSearching) {
      return [];
    }
    const local = searchOnboardingDestinations(trimmed);
    const apiResults = remote.query === trimmed ? remote.results : [];
    return mergeOnboardingSearchResults(local, apiResults).slice(0, 6);
  }, [isSearching, trimmed, remote]);

  return { results, loading: isSearching && loadingQuery === trimmed };
}

/** Where the visible map area sits between the floating top UI and the sheet. */
function useFocusY() {
  const topRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [focusY, setFocusY] = useState(200);

  useLayoutEffect(() => {
    const top = topRef.current;
    const sheet = sheetRef.current;
    if (!top || !sheet) {
      return;
    }

    const measure = () => {
      setFocusY((top.offsetTop + top.offsetHeight + sheet.offsetTop) / 2 + 20);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(top);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  return { topRef, sheetRef, focusY };
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-semibold uppercase tracking-[0.075em] text-[#F472B6]">
      {children}
    </p>
  );
}

function SquareIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-pink-500/[0.13] text-[#F472B6] transition-colors active:bg-pink-500/25"
    >
      {children}
    </button>
  );
}

export function OnboardingAppSandbox({
  initialDestination,
  onSelect,
  onLockedClick,
  onSetPosition,
}: {
  initialDestination?: OnboardingDestination | null;
  onSelect?: (destination: OnboardingDestination, source: SelectionSource) => void;
  onLockedClick?: (feature: LockedFeature) => void;
  /** `origin` is the tap point, where the exit transition starts. */
  onSetPosition: (destination: OnboardingDestination, origin: { x: number; y: number }) => void;
}) {
  const [mode, setMode] = useState<Mode>("teleport");
  const [selected, setSelected] = useState<OnboardingDestination | null>(
    initialDestination ?? null
  );
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [category, setCategory] = useState("all");
  const [recenterKey, setRecenterKey] = useState(0);
  const [lockedToast, setLockedToast] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const reducedMotion = useReducedMotion();
  const enter = (delay: number, y: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { type: "spring" as const, stiffness: 260, damping: 28, delay },
        };
  const inputRef = useRef<HTMLInputElement>(null);
  const reverseRequest = useRef<AbortController | null>(null);
  const { topRef, sheetRef, focusY } = useFocusY();
  const { results, loading } = useDestinationSearch(query);
  const showResults = searchFocused && query.trim().length >= 2;

  useEffect(() => {
    if (!lockedToast) {
      return;
    }
    const timer = window.setTimeout(() => setLockedToast(0), 2200);
    return () => window.clearTimeout(timer);
  }, [lockedToast]);

  const select = useCallback(
    (destination: OnboardingDestination, source: SelectionSource) => {
      reverseRequest.current?.abort();
      setSelected(destination);
      setMode("teleport");
      setRecenterKey((key) => key + 1);
      onSelect?.(destination, source);
    },
    [onSelect]
  );

  function showLocked(feature: LockedFeature) {
    setLockedToast((count) => count + 1);
    onLockedClick?.(feature);
  }

  function pickResult(destination: OnboardingDestination) {
    setQuery("");
    setSearchFocused(false);
    inputRef.current?.blur();
    select(destination, "search");
  }

  const handleMapTap = useCallback(
    (point: MapPoint) => {
      if (searchFocused) {
        inputRef.current?.blur();
        setSearchFocused(false);
        return;
      }

      const coords = formatCoords(point.lat, point.lng);
      const destination: OnboardingDestination = {
        id: `map-${coords}`,
        city: coords,
        area: "",
        emoji: "📍",
        lat: point.lat,
        lng: point.lng,
      };
      select(destination, "map");

      // Name the point like the app does (reverse geocoding), when it resolves.
      const controller = new AbortController();
      reverseRequest.current = controller;
      void fetch(`/api/geocode?q=${encodeURIComponent(coords)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((data: { results?: GeocodeResult[] }) => {
          const place = data.results?.[0];
          if (!place || controller.signal.aborted) {
            return;
          }
          const named = geocodeResultToOnboardingDestination(place);
          setSelected((current) =>
            current?.id === destination.id
              ? { ...current, city: named.city, area: named.area, emoji: named.emoji }
              : current
          );
        })
        .catch(() => {});
    },
    [searchFocused, select]
  );

  const spots = useMemo(
    () => APP_SPOTS.filter((spot) => category === "all" || spot.category === category),
    [category]
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0A0A0C] text-[#F4F4F5]">
      <div
        className={cn(
          "absolute inset-0 z-0 transition-opacity duration-500",
          mapReady ? "opacity-100" : "opacity-0"
        )}
      >
        <OnboardingAppMap
          selected={selected}
          focusY={focusY}
          recenterKey={recenterKey}
          onTap={handleMapTap}
          onReady={() => setMapReady(true)}
        />
      </div>

      {/* Top bar + search */}
      <motion.div
        ref={topRef}
        {...enter(0.05, -16)}
        className="absolute inset-x-3.5 z-[500] space-y-2.5"
        style={{ top: "max(10px, env(safe-area-inset-top))" }}
      >
        <div className={cn(floatingCard, "flex h-[52px] items-center gap-2.5 pl-4 pr-1.5")}>
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            unoptimized
            className="h-7 w-7 rounded-lg"
          />
          <span className="text-[19px] font-semibold">Anyloc</span>
          <span className="flex-1" />
          <button
            type="button"
            aria-label="Favoris"
            onClick={() => showLocked("favorites")}
            className="flex h-10 w-10 items-center justify-center text-[#F472B6]"
          >
            <Bookmark className="h-[19px] w-[19px]" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            aria-label="Réglages"
            onClick={() => showLocked("settings")}
            className="flex h-10 w-10 items-center justify-center text-[#C4C4CA]"
          >
            <Settings className="h-[19px] w-[19px]" />
          </button>
        </div>

        {mode === "teleport" && (
          <div className="space-y-1.5">
            <label className={cn(floatingCard, "flex h-[50px] items-center gap-3 px-4")}>
              <Search className="h-[18px] w-[18px] shrink-0 text-[#C4C4CA]" />
              <input
                ref={inputRef}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && results[0]) {
                    pickResult(results[0]);
                  }
                }}
                placeholder="Rechercher une ville, une adresse, un lieu"
                // 16px keeps iOS Safari from zooming into the field.
                className="min-w-0 flex-1 bg-transparent text-base text-[#F4F4F5] outline-none placeholder:text-[#8B8B94] [&::-webkit-search-cancel-button]:hidden"
              />
              {loading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#8B8B94]" />
              ) : (
                query && (
                  <button
                    type="button"
                    aria-label="Effacer"
                    onClick={() => setQuery("")}
                    className="text-[#55555D]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )
              )}
            </label>

            {showResults && results.length > 0 && (
              <div className={cn(floatingCard, "overflow-hidden rounded-2xl")}>
                {results.map((destination, index) => (
                  <button
                    key={destination.id}
                    type="button"
                    // Fire before the input's blur closes the list.
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => pickResult(destination)}
                    className={cn(
                      "flex h-[48px] w-full items-center gap-3 px-4 text-left active:bg-white/5",
                      index > 0 && "border-t border-[#25252B]"
                    )}
                  >
                    <MapPin className="h-4 w-4 shrink-0 fill-[#F472B6]/20 text-[#F472B6]" />
                    <span className="min-w-0 flex-1 truncate text-[15px] text-[#C4C4CA]">
                      {destination.city}
                      {destination.area && (
                        <span className="text-[#8B8B94]"> · {destination.area}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="pointer-events-none pr-1 text-right text-[9px] text-white/35">
          © Esri · © OpenStreetMap
        </p>
      </motion.div>

      {/* Bottom sheet */}
      <motion.div
        ref={sheetRef}
        {...enter(0.12, 48)}
        className="absolute inset-x-3 z-[500] rounded-[28px] border border-[#25252B] bg-[#0C0C0E]/[0.97] px-4 pb-4 pt-2.5 shadow-[0_-6px_20px_rgba(0,0,0,0.4)]"
        style={{ bottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-3.5 h-[5px] w-10 rounded-full bg-[#303038]" />

        <div className="flex gap-1">
          {(
            [
              { id: "teleport", label: "Téléporter", Icon: Navigation },
              { id: "explore", label: "Explorer", Icon: Globe },
            ] as const
          ).map(({ id, label, Icon }) => {
            const on = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  "flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[11px] text-[15px] font-medium transition-colors",
                  on ? "bg-pink-500/[0.13] text-[#F472B6]" : "text-[#C4C4CA]"
                )}
              >
                <Icon className={cn("h-4 w-4", on && id === "teleport" && "fill-current")} />
                {label}
              </button>
            );
          })}
        </div>

        {mode === "teleport" ? (
          <div className="pt-3.5">
            {selected ? (
              <div className="flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <Caption>Prêt</Caption>
                  <p className="mt-1 truncate text-[20px] font-semibold leading-tight">
                    {selected.emoji !== "📍" && `${selected.emoji} `}
                    {selected.city}
                  </p>
                  <p className="mt-1 truncate font-mono text-[14px] text-[#8B8B94]">
                    {formatCoords(selected.lat, selected.lng)}
                  </p>
                </div>
                <SquareIconButton label="Ajouter aux favoris" onClick={() => showLocked("favorites")}>
                  <Bookmark className="h-[18px] w-[18px]" strokeWidth={2.4} />
                </SquareIconButton>
                <SquareIconButton label="Recentrer" onClick={() => setRecenterKey((key) => key + 1)}>
                  <Navigation className="h-[18px] w-[18px] fill-current" />
                </SquareIconButton>
              </div>
            ) : (
              <div>
                <Caption>Prêt</Caption>
                <p className="mt-1 text-[17px] font-medium text-[#C4C4CA]">
                  Touche la carte ou cherche un lieu
                </p>
              </div>
            )}

            <div className="my-3.5 h-px bg-[#25252B]" />

            <button
              type="button"
              disabled={!selected}
              onClick={(event) => {
                if (!selected) return;
                const rect = event.currentTarget.getBoundingClientRect();
                onSetPosition(selected, {
                  x: event.clientX || rect.left + rect.width / 2,
                  y: event.clientY || rect.top + rect.height / 2,
                });
              }}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-[17px] font-semibold text-white shadow-[0_8px_14px_rgba(236,72,153,0.45)] transition-[opacity,transform] active:scale-[0.97] disabled:opacity-45 disabled:shadow-none"
            >
              <Crosshair className="h-5 w-5" strokeWidth={2.4} />
              Définir cette position
            </button>
          </div>
        ) : (
          <div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
              {APP_SPOT_CATEGORIES.map((cat) => {
                const on = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-3.5 py-[7px] text-[13px] font-semibold",
                      on
                        ? "border-pink-500/[0.42] bg-pink-500/[0.13] text-[#F472B6]"
                        : "border-[#25252B] bg-[#16161A] text-[#C4C4CA]"
                    )}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="-mr-2 max-h-[min(330px,40dvh)] overflow-y-auto overscroll-contain pr-2">
              {spots.map((spot) => (
                <button
                  key={spot.name}
                  type="button"
                  onClick={() => select(spotToDestination(spot), "explore")}
                  className="flex w-full items-center gap-3 py-1.5 text-left"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#1C1C21] text-[22px]">
                    {spot.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold">{spot.name}</span>
                    <span className="block truncate text-[12.5px] text-[#8B8B94]">
                      {spot.country}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#55555D]" strokeWidth={2.6} />
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {lockedToast > 0 && (
          <motion.div
            key={lockedToast}
            role="status"
            className="pointer-events-none absolute inset-x-6 z-[600] flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-center text-[14px] font-semibold text-zinc-900 shadow-2xl"
            style={{ top: Math.max(focusY - 60, 140) }}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
          >
            <Lock className="h-4 w-4 shrink-0 text-pink-500" />
            Disponible après ton inscription
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
