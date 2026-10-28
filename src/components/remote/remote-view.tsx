"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  Earth,
  Loader2,
  MapPin,
  Navigation,
  Navigation2,
  Settings,
  Share,
  Square,
  X,
} from "lucide-react";
import { LocationSearch } from "@/components/dashboard/location-search";
import { useLocationSync } from "@/hooks/use-location-sync";
import { DEFAULT_LOCATION } from "@/lib/location";
import { REMOTE_SPOT_CATEGORIES, REMOTE_SPOTS } from "@/lib/remote-spots";
import { cn } from "@/lib/utils";

const LocationMap = dynamic(
  () => import("@/components/dashboard/location-map"),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[#0a0a0c]" />,
  }
);

type Place = { name: string; lat: number; lng: number };
type Mode = "teleport" | "explore";
type Banner = { kind: "flying" | "arrived"; name: string };
type ShowcaseStep = "connecting" | "sending" | "done";

const FAVORITES_KEY = "anyloc.remote.favorites";
const HOME_HINT_DISMISSED_KEY = "anyloc.remote.homeHintDismissed";
// "Mode tournage" of the iOS app: /app?tournage=1 turns it on, ?tournage=0 off.
const FILMING_MODE_KEY = "anyloc.remote.filmingMode";
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

function readFilmingMode() {
  try {
    const param = new URLSearchParams(window.location.search).get("tournage");
    if (param === "1" || param === "0") {
      window.localStorage.setItem(FILMING_MODE_KEY, param);
    }
    return window.localStorage.getItem(FILMING_MODE_KEY) === "1";
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

function formatCoords(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function formatElapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60;
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

async function placeName(lat: number, lng: number) {
  try {
    const response = await fetch(
      `/api/geocode?q=${encodeURIComponent(`${lat}, ${lng}`)}`
    );
    const data = await response.json();
    const name: string | undefined = data.results?.[0]?.name;
    return name?.split(",").slice(0, 2).join(",").trim() || null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const floating =
  "border border-[#25252b] bg-[#0a0a0c]/[0.93] backdrop-blur-md";

function Caption({ text, error }: { text: string; error?: boolean }) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.075em]",
        error ? "text-[#f87171]" : "text-[#f472b6]"
      )}
    >
      {text}
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
      onClick={onClick}
      aria-label={label}
      className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[14px] bg-[#ec4899]/[0.13] text-[#f472b6]"
    >
      {children}
    </button>
  );
}

function AddToHomeScreenHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className={cn("pointer-events-auto rounded-[18px] p-3", floating)}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ec4899]/[0.13]">
          <Share className="h-4 w-4 text-[#f472b6]" />
        </div>
        <p className="flex-1 text-xs leading-relaxed text-[#c4c4ca]">
          <strong className="text-[#f4f4f5]">
            Ajoute Anyloc à ton écran d&apos;accueil
          </strong>{" "}
          : touche <strong className="text-[#f4f4f5]">Partager</strong> en bas
          de Safari, puis{" "}
          <strong className="text-[#f4f4f5]">Sur l&apos;écran d&apos;accueil</strong>
          . Tu l&apos;ouvriras comme une app.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Masquer"
          className="rounded-full p-1 text-[#55555d] hover:text-[#c4c4ca]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TeleportBanner({ banner }: { banner: Banner }) {
  return (
    <div className="flex justify-center">
      <div className="flex h-11 max-w-full items-center gap-2.5 rounded-full border border-[#ec4899]/40 bg-[#0a0a0c]/[0.93] px-4 text-[15px] font-semibold text-[#f4f4f5] shadow-[0_6px_14px_rgba(236,72,153,0.35)] backdrop-blur-md">
        {banner.kind === "flying" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#f472b6]" />
        ) : (
          <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-[#ec4899]" />
        )}
        <span className="truncate">
          {banner.kind === "flying"
            ? `Téléportation vers ${banner.name}…`
            : `Téléporté à ${banner.name}`}
        </span>
      </div>
    </div>
  );
}

/** Full-screen branded loading shown during a teleport in filming mode. */
function TeleportShowcase({
  destination,
  step,
}: {
  destination: string;
  step: ShowcaseStep;
}) {
  const stepText =
    step === "connecting"
      ? "Connexion à l'iPhone…"
      : step === "sending"
        ? `Téléportation vers ${destination}…`
        : `Tu es à ${destination}`;

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-7 bg-[#0a0a0c]/95 px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.35),transparent_320px)]" />
      <div
        className="relative flex h-[220px] w-[220px] items-center justify-center"
        style={{ animation: "showcase-enter 0.7s 0.25s both" }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute h-[150px] w-[150px] rounded-full border-2 border-[#ec4899]"
            style={{
              animation: `showcase-ring 1.8s ${i * 0.6}s ease-out infinite`,
            }}
          />
        ))}
        <Image
          src="/logo-mark.png"
          alt=""
          width={140}
          height={140}
          className="relative h-[140px] w-[140px] object-contain drop-shadow-[0_0_24px_rgba(236,72,153,0.6)]"
          priority
        />
      </div>
      <p
        className="relative text-[clamp(40px,15vw,60px)] font-extrabold leading-none text-white"
        style={{ animation: "showcase-enter 0.6s 0.75s both" }}
      >
        anyloc
        <span className="bg-gradient-to-br from-[#ec4899] to-[#a855f7] bg-clip-text text-transparent">
          .io
        </span>
      </p>
      <div
        className="relative flex h-[50px] max-w-full items-center gap-2.5 rounded-full border border-[#ec4899]/40 bg-[#16161a] px-5 text-[19px] font-semibold text-[#c4c4ca]"
        style={{ animation: "showcase-enter 0.5s 1.2s both" }}
      >
        {step === "done" ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#ec4899]" />
        ) : (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#f472b6]" />
        )}
        <span className="truncate">{stepText}</span>
      </div>
    </div>
  );
}

/** Replaces the CTA while the fake position is live: elapsed time + stop. */
function ActiveLocationBar({
  since,
  disabled,
  onStop,
}: {
  since: number;
  disabled: boolean;
  onStop: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-2.5">
      <div className="flex h-16 flex-1 items-center gap-3 rounded-2xl border border-[#25252b] bg-[#16161a] px-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ec4899]/[0.13]">
          <Navigation className="h-[17px] w-[17px] fill-current text-[#f472b6]" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-[#8b8b94]">
            Position simulée
          </p>
          <p className="font-mono text-xl font-semibold text-[#f472b6]">
            {formatElapsed(now - since)}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onStop}
        className="flex h-16 w-[78px] flex-col items-center justify-center gap-1 rounded-2xl border border-[#f87171]/40 bg-[#f87171]/[0.12] text-[13px] font-semibold text-[#f87171] disabled:opacity-60"
      >
        <Square className="h-4 w-4 fill-current" />
        Stop
      </button>
    </div>
  );
}

function SavedSheet({
  favorites,
  onPick,
  onClose,
}: {
  favorites: Place[];
  onPick: (place: Place) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1500] flex items-end bg-black/50"
      onClick={onClose}
    >
      <div
        className="max-h-[70vh] w-full overflow-y-auto rounded-t-[28px] border-t border-[#25252b] bg-[#0a0a0c] px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-[5px] w-10 rounded-full bg-[#303038]" />
        <p className="mb-3 text-xl font-semibold text-[#f4f4f5]">Favoris</p>
        {favorites.length === 0 ? (
          <p className="pb-6 text-[15px] text-[#8b8b94]">
            Aucun favori. Touche le marque-page d&apos;un lieu pour l&apos;ajouter.
          </p>
        ) : (
          favorites.map((place) => (
            <button
              key={`${place.lat},${place.lng}`}
              type="button"
              onClick={() => onPick(place)}
              className="flex w-full items-center gap-3 py-1.5 text-left"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#1c1c21]">
                <MapPin className="h-5 w-5 text-[#f472b6]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-[#f4f4f5]">
                  {place.name}
                </span>
                <span className="block font-mono text-[12.5px] text-[#8b8b94]">
                  {formatCoords(place.lat, place.lng)}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-[#55555d]" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function RemoteView() {
  const { location, loading, saving, error, saveLocation } = useLocationSync({
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  // null = nothing picked yet: show the position already active on the
  // account (set from the computer or another device), like the iOS app.
  const [picked, setSelected] = useState<Place | null>(null);
  const [mode, setMode] = useState<Mode>("teleport");
  const [spotCategory, setSpotCategory] = useState("all");
  const [collapsed, setCollapsed] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [showcase, setShowcase] = useState<{
    destination: string;
    step: ShowcaseStep;
  } | null>(null);
  const [offline, setOffline] = useState(false);
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
  const geocodeRef = useRef(0);

  const isActive = location?.isActive ?? false;
  const selected = useMemo<Place | null>(
    () =>
      picked ??
      (location?.isActive
        ? { name: location.name, lat: location.lat, lng: location.lng }
        : null),
    [picked, location]
  );
  const activeSince =
    isActive && location?.updatedAt ? Date.parse(location.updatedAt) : null;

  const favorites = storedFavorites ?? (isClient ? readFavorites() : []);
  const showHomeHint =
    isClient &&
    !homeHintDismissed &&
    !readHomeHintDismissed() &&
    isIosSafariBrowser();

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const flash = useCallback((text: string, isError = false) => {
    setStatus({ text, error: isError });
    window.setTimeout(() => setStatus(null), 3000);
  }, []);

  const select = useCallback((place: Place, resolveName: boolean) => {
    setMode("teleport");
    setSelected(place);
    const request = ++geocodeRef.current;
    if (!resolveName) {
      return;
    }
    void placeName(place.lat, place.lng).then((name) => {
      if (name && geocodeRef.current === request) {
        setSelected((current) =>
          current && current.lat === place.lat && current.lng === place.lng
            ? { ...current, name }
            : current
        );
      }
    });
  }, []);

  const teleport = useCallback(
    async (place: Place) => {
      setSelected(place);
      const apply = saveLocation({
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        isActive: true,
      }).then(
        () => true,
        (saveError: unknown) => {
          flash(
            saveError instanceof Error
              ? saveError.message
              : "Impossible d'enregistrer ta position.",
            true
          );
          return false;
        }
      );

      if (readFilmingMode()) {
        // The branded card stays at least ~4 s so it reads on camera.
        const start = Date.now();
        setShowcase({ destination: place.name, step: "connecting" });
        await sleep(2200);
        setShowcase({ destination: place.name, step: "sending" });
        const ok = await apply;
        const remaining = 4200 - (Date.now() - start);
        if (remaining > 0) await sleep(remaining);
        if (ok) {
          setShowcase({ destination: place.name, step: "done" });
          await sleep(1600);
        }
        setShowcase(null);
        setRecenterKey((key) => key + 1);
        return;
      }

      setBanner({ kind: "flying", name: place.name });
      const [ok] = await Promise.all([apply, sleep(1600)]);
      if (!ok) {
        setBanner(null);
        return;
      }
      setBanner({ kind: "arrived", name: place.name });
      await sleep(2400);
      setBanner((current) =>
        current?.kind === "arrived" && current.name === place.name
          ? null
          : current
      );
    },
    [saveLocation, flash]
  );

  const stop = useCallback(async () => {
    const place = selected ?? location;
    if (!place) {
      return;
    }
    try {
      await saveLocation({
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        isActive: false,
      });
      flash("Position réelle rétablie");
    } catch {
      // error is surfaced by useLocationSync
    }
  }, [saveLocation, selected, location, flash]);

  const toggleFavorite = useCallback((place: Place) => {
    setFavorites((stored) => {
      const current = stored ?? readFavorites();
      const exists = current.some(
        (fav) => fav.lat === place.lat && fav.lng === place.lng
      );
      const next = exists
        ? current.filter(
            (fav) => !(fav.lat === place.lat && fav.lng === place.lng)
          )
        : [place, ...current].slice(0, 20);
      writeFavorites(next);
      return next;
    });
  }, []);

  const dismissHomeHint = useCallback(() => {
    setHomeHintDismissed(true);
    try {
      window.localStorage.setItem(HOME_HINT_DISMISSED_KEY, "1");
    } catch {}
  }, []);

  const shownStatus = error ? { text: error, error: true } : status;

  const isFavorite =
    selected != null &&
    favorites.some((fav) => fav.lat === selected.lat && fav.lng === selected.lng);
  const isSelectedActive =
    isActive &&
    selected != null &&
    location != null &&
    location.lat === selected.lat &&
    location.lng === selected.lng;
  const readyLabel = offline ? "Hors ligne" : loading ? "Chargement…" : "Prêt";
  const statusText = isSelectedActive ? "Position active" : readyLabel;
  const isBusy = saving || banner?.kind === "flying" || showcase != null;
  const mapPlace = selected ?? DEFAULT_LOCATION;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0c] text-[#f4f4f5]">
      {/* Pinch-to-zoom on phones; Leaflet's +/- would sit under the search bar. */}
      <div className="absolute inset-0 [&_.leaflet-control-zoom]:hidden">
        <LocationMap
          selected={mapPlace}
          onSelect={(place) => select(place, true)}
          active={isSelectedActive}
          fullScreen
          dark
          showPin={selected != null && mode === "teleport"}
          recenterKey={recenterKey}
        />
      </div>

      <div className="pointer-events-none relative z-[1000] flex flex-col gap-2.5 px-3.5 pt-[max(env(safe-area-inset-top),0.5rem)]">
        {/* Buttons on either side so the wordmark sits dead centre for screen recordings. */}
        <div
          className={cn(
            "pointer-events-auto flex h-[58px] items-center rounded-[18px] px-2",
            floating
          )}
        >
          <button
            type="button"
            onClick={() => setShowSaved(true)}
            aria-label="Favoris"
            className="flex h-11 w-11 items-center justify-center text-[#f472b6]"
          >
            <Bookmark className="h-5 w-5" strokeWidth={2.4} />
          </button>
          <p className="flex-1 text-center font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[21px] font-bold tracking-[-0.02em]">
            Anyloc<span className="text-[#f472b6]">.io</span>
          </p>
          <Link
            href="/dashboard?tab=account"
            aria-label="Réglages"
            className="flex h-11 w-11 items-center justify-center text-[#c4c4ca]"
          >
            <Settings className="h-5 w-5" strokeWidth={2.2} />
          </Link>
        </div>

        {mode === "teleport" ? (
          <div className="pointer-events-auto">
            <LocationSearch
              variant="dark"
              onSelect={(place) => select(place, false)}
            />
          </div>
        ) : null}

        {banner ? <TeleportBanner banner={banner} /> : null}
        {showHomeHint ? <AddToHomeScreenHint onDismiss={dismissHomeHint} /> : null}
      </div>

      <div className="relative z-[1000] mt-auto px-3 pb-[max(env(safe-area-inset-bottom),0.375rem)]">
        <div className="rounded-[28px] border border-[#25252b] bg-[#0c0c0e]/[0.97] px-4 pb-4 pt-2.5 shadow-[0_-6px_20px_rgba(0,0,0,0.4)]">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Déplier" : "Replier"}
            className="flex w-full justify-center pb-3.5"
          >
            <span className="h-[5px] w-10 rounded-full bg-[#303038]" />
          </button>

          <div className="flex gap-1 rounded-[15px] border border-[#25252b] bg-[#070708] p-1">
            {(
              [
                { value: "teleport", label: "Téléporter", Icon: Navigation },
                { value: "explore", label: "Explorer", Icon: Earth },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[11px] text-base font-medium transition-colors",
                  mode === value
                    ? "bg-[#ec4899]/[0.13] text-[#f472b6]"
                    : "text-[#c4c4ca]"
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px]",
                    value === "teleport" && "fill-current"
                  )}
                />
                {label}
              </button>
            ))}
          </div>

          {collapsed ? null : mode === "teleport" ? (
            <div className="pt-3.5">
              {selected ? (
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Caption text={statusText} error={offline} />
                    <p className="truncate text-xl font-semibold">
                      {selected.name}
                    </p>
                    <p className="font-mono text-sm text-[#8b8b94]">
                      {formatCoords(selected.lat, selected.lng)}
                    </p>
                  </div>
                  <SquareIconButton
                    label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    onClick={() => toggleFavorite(selected)}
                  >
                    <Bookmark
                      className={cn("h-5 w-5", isFavorite && "fill-current")}
                      strokeWidth={2.4}
                    />
                  </SquareIconButton>
                  <SquareIconButton
                    label="Recentrer"
                    onClick={() => setRecenterKey((key) => key + 1)}
                  >
                    <Navigation2 className="h-5 w-5 fill-current" />
                  </SquareIconButton>
                </div>
              ) : (
                <div className="space-y-1">
                  <Caption text={readyLabel} error={offline} />
                  <p className="text-[17px] font-medium text-[#c4c4ca]">
                    Touche la carte ou cherche un lieu
                  </p>
                </div>
              )}

              <div className="my-3.5 h-px bg-[#25252b]" />

              {isSelectedActive && activeSince ? (
                <ActiveLocationBar
                  since={activeSince}
                  disabled={isBusy}
                  onStop={() => void stop()}
                />
              ) : (
                <>
                  <button
                    type="button"
                    disabled={selected == null || isBusy || offline}
                    onClick={() => selected && void teleport(selected)}
                    data-track="remote_teleport"
                    className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-br from-[#ec4899] to-[#a855f7] text-[17px] font-semibold text-white shadow-[0_8px_14px_rgba(236,72,153,0.45)] disabled:opacity-45 disabled:shadow-none"
                  >
                    {isBusy ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Crosshair className="h-5 w-5" strokeWidth={2.4} />
                    )}
                    Définir cette position
                  </button>
                  {isActive ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void stop()}
                      className="w-full pt-3 text-sm font-medium text-[#8b8b94]"
                    >
                      Revenir à ma vraie position
                    </button>
                  ) : null}
                </>
              )}

              {shownStatus ? (
                <p
                  className={cn(
                    "pt-2.5 text-center text-[13px] font-semibold",
                    shownStatus.error ? "text-[#f87171]" : "text-[#f472b6]"
                  )}
                >
                  {shownStatus.text}
                </p>
              ) : null}
            </div>
          ) : (
            <div>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
                {REMOTE_SPOT_CATEGORIES.map((category) => {
                  const on = spotCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSpotCategory(category.id)}
                      className={cn(
                        "shrink-0 rounded-full border px-3.5 py-[7px] text-[13px] font-semibold",
                        on
                          ? "border-[#ec4899]/40 bg-[#ec4899]/[0.13] text-[#f472b6]"
                          : "border-[#25252b] bg-[#16161a] text-[#c4c4ca]"
                      )}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
              <div className="h-[330px] overflow-y-auto [scrollbar-width:none]">
                {REMOTE_SPOTS.filter(
                  (spot) =>
                    spotCategory === "all" || spot.category === spotCategory
                ).map((spot) => (
                  <button
                    key={`${spot.name}-${spot.lat}`}
                    type="button"
                    onClick={() =>
                      select(
                        { name: spot.name, lat: spot.lat, lng: spot.lng },
                        false
                      )
                    }
                    className="flex w-full items-center gap-3 py-1.5 text-left"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#1c1c21] text-[22px]">
                      {spot.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold">
                        {spot.name}
                      </span>
                      <span className="block truncate text-[12.5px] text-[#8b8b94]">
                        {spot.country}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#55555d]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSaved ? (
        <SavedSheet
          favorites={favorites}
          onClose={() => setShowSaved(false)}
          onPick={(place) => {
            setShowSaved(false);
            setMode("teleport");
            void teleport(place);
          }}
        />
      ) : null}

      {showcase ? (
        <TeleportShowcase
          destination={showcase.destination}
          step={showcase.step}
        />
      ) : null}
    </div>
  );
}
