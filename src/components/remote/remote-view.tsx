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
import type { InstallTrack } from "@/components/dashboard/paid-dashboard-view";
import { RemotePlansSheet } from "@/components/remote/remote-plans-sheet";
import { useLocationSync } from "@/hooks/use-location-sync";
import { track } from "@/lib/analytics/track";
import { DEFAULT_LOCATION } from "@/lib/location";
import { REMOTE_SPOT_CATEGORIES, REMOTE_SPOTS } from "@/lib/remote-spots";
import { cn } from "@/lib/utils";

const RemoteMap = dynamic(() => import("@/components/remote/remote-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#151518]" />,
});

// iOS system fonts, so Safari renders /app in SF Pro like the native app.
const SYSTEM_FONT =
  "[font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Text',system-ui,sans-serif]";
const MONO_FONT = "[font-family:ui-monospace,'SF_Mono',Menlo,monospace]";
/** Press feedback shared by the remote's buttons. */
const PRESSABLE = "transition-transform duration-150 active:scale-[0.96]";

type Place = { name: string; lat: number; lng: number };
type Mode = "teleport" | "explore";
type Banner = { kind: "flying" | "arrived"; name: string };
type ShowcaseStep = "connecting" | "sending" | "done";
// Fade length of the branded card, in and out (the iOS app uses 0.7 s).
const SHOWCASE_FADE_MS = 600;

const FAVORITES_KEY = "anyloc.remote.favorites";
// Spot teleported to before paying: picked again once the subscription is on.
const PENDING_PLACE_KEY = "anyloc.remote.pendingPlace";
const HOME_HINT_DISMISSED_KEY = "anyloc.remote.homeHintDismissed";
// "Mode tournage" of the iOS app, on by default here: ?tournage=0 turns it off,
// ?tournage=1 back on.
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

function readPendingPlace(): Place | null {
  try {
    const raw = window.localStorage.getItem(PENDING_PLACE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed &&
      typeof parsed.name === "string" &&
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function writePendingPlace(place: Place | null) {
  try {
    if (place) {
      window.localStorage.setItem(PENDING_PLACE_KEY, JSON.stringify(place));
    } else {
      window.localStorage.removeItem(PENDING_PLACE_KEY);
    }
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
    return window.localStorage.getItem(FILMING_MODE_KEY) !== "0";
  } catch {
    return true;
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
        "text-[11px] font-semibold uppercase tracking-[0.075em]",
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
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#ec4899]/[0.13] text-[#f472b6]",
        PRESSABLE
      )}
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
    <div className="flex animate-[remote-in_0.35s_cubic-bezier(0.32,0.72,0,1)] justify-center">
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

/** "anyloc.io" in SF Pro Rounded, shared by the top bar and the teleport card. */
function Wordmark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <p
      className={cn(
        "font-black leading-none text-white [font-family:ui-rounded,'SF_Pro_Rounded',system-ui,sans-serif]",
        className
      )}
      style={style}
    >
      anyloc
      <span className="bg-gradient-to-br from-[#ec4899] to-[#a855f7] bg-clip-text text-transparent">
        .io
      </span>
    </p>
  );
}

/** Full-screen branded loading shown during a teleport in filming mode. */
function TeleportShowcase({
  destination,
  step,
  closing,
}: {
  destination: string;
  step: ShowcaseStep;
  closing: boolean;
}) {
  const stepText =
    step === "connecting"
      ? "Connexion à l'iPhone…"
      : step === "sending"
        ? `Téléportation vers ${destination}…`
        : `Tu es à ${destination}`;

  return (
    <div
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-7 bg-[#0a0a0c]/95 px-6"
      style={{
        animation: `${closing ? "showcase-fade-out" : "showcase-fade-in"} ${SHOWCASE_FADE_MS}ms ease-in-out both`,
      }}
    >
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
          style={{ animation: "showcase-pulse 0.9s ease-in-out infinite alternate" }}
          priority
        />
      </div>
      <Wordmark
        className="relative text-[clamp(40px,15vw,60px)]"
        style={{ animation: "showcase-enter 0.6s 0.75s both" }}
      />
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
      <div className="flex h-11 flex-1 items-center gap-2.5 rounded-[14px] border border-[#25252b] bg-[#16161a] px-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#ec4899]/[0.13]">
          <Navigation className="h-[15px] w-[15px] fill-current text-[#f472b6]" />
        </div>
        <div>
          <p className="text-[11px] font-medium leading-tight text-[#8b8b94]">
            Position simulée
          </p>
          <p
            className={cn(
              "text-base font-semibold leading-tight tabular-nums text-[#f472b6]",
              MONO_FONT
            )}
          >
            {formatElapsed(now - since)}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onStop}
        className="flex h-11 w-16 flex-col items-center justify-center gap-0.5 rounded-[14px] border border-[#f87171]/40 bg-[#f87171]/[0.12] text-xs font-semibold text-[#f87171] disabled:opacity-60"
      >
        <Square className="h-3.5 w-3.5 fill-current" />
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
                <span className={cn("block text-[12.5px] text-[#8b8b94]", MONO_FONT)}>
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

/**
 * Shown on arrival when the account has no subscription: the teleport only
 * played on the map, paying is what sends the position to the iPhone.
 */
function ActivateLocationDialog({
  place,
  onActivate,
  onClose,
}: {
  place: Place;
  onActivate: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 px-6 animate-[remote-fade_0.25s_ease-out]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dernière étape"
        className="w-full max-w-[340px] rounded-[28px] border border-[#25252b] bg-[#0a0a0c] px-5 pb-4 pt-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#ec4899]/[0.13]">
          <Navigation className="h-6 w-6 fill-current text-[#f472b6]" />
        </div>
        <p className="text-center text-[13px] font-semibold uppercase tracking-wide text-[#f472b6]">
          Dernière étape
        </p>
        <p className="mt-1 text-center text-[22px] font-bold leading-tight text-[#f4f4f5]">
          Active ta localisation
        </p>
        <p className="mx-auto mt-2 text-center text-[15px] leading-snug text-[#8b8b94]">
          Ta position est prête à{" "}
          <span className="font-semibold text-[#f4f4f5]">{place.name}</span>. Active-la
          pour qu&apos;elle s&apos;affiche sur ton iPhone.
        </p>
        <button
          type="button"
          onClick={onActivate}
          data-track="remote_activate_location"
          className={cn(
            "mt-6 flex h-12 w-full items-center justify-center rounded-[14px] bg-gradient-to-br from-[#ec4899] to-[#a855f7] text-base font-semibold text-white shadow-[0_6px_12px_rgba(236,72,153,0.4)]",
            PRESSABLE
          )}
        >
          Activer ma localisation
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full pt-3 text-[13px] font-medium text-[#8b8b94]"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}

/** Install step after a payment, as the dashboard splits it (see InstallTrack). */
const SETUP_COPY: Record<InstallTrack, { title: string; text: string; steps: string[] }> = {
  iphone: {
    title: "Installe Anyloc sur ton iPhone",
    text: "Une seule fois, sans ordi ni câble. Ça prend 5 minutes.",
    steps: [
      "Autorise le profil Anyloc",
      "Réglages → Profil téléchargé → Installer",
      "Reviens ici : ta position s'active",
    ],
  },
  desktop: {
    title: "Installe Anyloc sur ton ordi",
    text: "Une seule fois, 10 minutes. Ensuite tout se passe ici.",
    steps: [
      "Télécharge Anyloc sur ton Mac ou PC",
      "Branche ton iPhone en USB",
      "Reviens ici : ta position s'active",
    ],
  },
};

/**
 * Shown when the payment made from the plans sheet comes back to /app: the
 * account is active, but the position only moves once Anyloc is installed.
 */
function SetupDialog({
  installTrack,
  onClose,
}: {
  installTrack: InstallTrack;
  onClose: () => void;
}) {
  const copy = SETUP_COPY[installTrack];
  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 px-6 animate-[remote-fade_0.25s_ease-out]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        className="w-full max-w-[340px] rounded-[28px] border border-[#25252b] bg-[#0a0a0c] px-5 pb-4 pt-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#ec4899]/[0.13]">
          <CheckCircle2 className="h-7 w-7 text-[#f472b6]" />
        </div>
        <p className="text-center text-[13px] font-semibold uppercase tracking-wide text-[#f472b6]">
          Paiement confirmé
        </p>
        <p className="mt-1 text-center text-[22px] font-bold leading-tight text-[#f4f4f5]">
          {copy.title}
        </p>
        <p className="mx-auto mt-2 text-center text-[15px] leading-snug text-[#8b8b94]">
          {copy.text}
        </p>
        <ol className="mt-5 space-y-2">
          {copy.steps.map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-3 rounded-[14px] border border-[#25252b] bg-[#16161a] px-3 py-2.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ec4899] text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="text-[14px] font-medium text-[#f4f4f5]">{step}</span>
            </li>
          ))}
        </ol>
        <Link
          href="/dashboard"
          data-track="remote_setup_cta"
          data-track-install-track={installTrack}
          className={cn(
            "mt-6 flex h-12 w-full items-center justify-center rounded-[14px] bg-gradient-to-br from-[#ec4899] to-[#a855f7] text-base font-semibold text-white shadow-[0_6px_12px_rgba(236,72,153,0.4)]",
            PRESSABLE
          )}
        >
          Configurer maintenant
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="w-full pt-3 text-[13px] font-medium text-[#8b8b94]"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}

export function RemoteView({
  hasAccess,
  justPaid = false,
  installTrack,
  planId,
  stripePublishableKey,
}: {
  hasAccess: boolean;
  /** Back from a payment made in the plans sheet: opens the setup popup. */
  justPaid?: boolean;
  installTrack: InstallTrack;
  /** Plan preselected in the plans sheet, mapped to the visitor's price grid. */
  planId: string;
  stripePublishableKey: string;
}) {
  const { location, loading, saving, error, saveLocation } = useLocationSync({
    pollIntervalMs: POLL_INTERVAL_MS,
    enabled: hasAccess,
  });

  // null = nothing picked yet: show the position already active on the
  // account (set from the computer or another device), like the iOS app.
  const [picked, setSelected] = useState<Place | null>(null);
  const [mode, setMode] = useState<Mode>("teleport");
  const [spotCategory, setSpotCategory] = useState("all");
  const [collapsed, setCollapsed] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);
  const [landingKey, setLandingKey] = useState(0);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [showcase, setShowcase] = useState<{
    destination: string;
    step: ShowcaseStep;
    closing?: boolean;
  } | null>(null);
  const [offline, setOffline] = useState(false);
  // Destination reached without a subscription: asks to pay to validate it.
  const [paywallPlace, setPaywallPlace] = useState<Place | null>(null);
  const [plansPlace, setPlansPlace] = useState<Place | null>(null);
  const [showSetup, setShowSetup] = useState(justPaid);

  useEffect(() => {
    if (!justPaid) return;
    track("remote_setup_shown", { install_track: installTrack });
    // Drop ?paye=1 so a reload doesn't show the popup again.
    const url = new URL(window.location.href);
    url.searchParams.delete("paye");
    window.history.replaceState(null, "", url);
  }, [justPaid, installTrack]);
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
  const cameraMovingRef = useRef(false);

  const isActive = location?.isActive ?? false;
  // Back after paying: the spot teleported to before is picked again, one
  // tap away from being sent for real.
  const pendingPlace = useMemo(
    () => (hasAccess && isClient ? readPendingPlace() : null),
    [hasAccess, isClient]
  );
  const selected = useMemo<Place | null>(
    () =>
      picked ??
      pendingPlace ??
      (location?.isActive
        ? { name: location.name, lat: location.lat, lng: location.lng }
        : null),
    [picked, pendingPlace, location]
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

  const handleCameraMoving = useCallback((moving: boolean) => {
    cameraMovingRef.current = moving;
  }, []);

  /** Resolves once the camera has been still for a moment (at most ~6 s). */
  const waitForCameraSettled = useCallback(async () => {
    const deadline = Date.now() + 6000;
    let stillFor = 0;
    while (stillFor < 400 && Date.now() < deadline) {
      await sleep(100);
      stillFor = cameraMovingRef.current ? 0 : stillFor + 100;
    }
  }, []);

  const teleport = useCallback(
    async (place: Place) => {
      setSelected(place);
      // No subscription: the whole teleport plays, but nothing is sent (the
      // API would refuse) and the paywall opens on arrival.
      writePendingPlace(hasAccess ? null : place);
      // Once the zoom onto the destination is over, not on top of it.
      const showPaywall = async () => {
        await waitForCameraSettled();
        track("remote_paywall_shown", { destination: place.name });
        setPaywallPlace(place);
      };
      const apply = (
        hasAccess
          ? saveLocation({
              name: place.name,
              lat: place.lat,
              lng: place.lng,
              isActive: true,
            })
          : Promise.resolve()
      ).then(
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
        // Start the descent behind the card so it fades straight into it.
        if (ok) setLandingKey((key) => key + 1);
        setShowcase((current) => current && { ...current, closing: true });
        await sleep(SHOWCASE_FADE_MS);
        setShowcase(null);
        if (ok && !hasAccess) await showPaywall();
        return;
      }

      setBanner({ kind: "flying", name: place.name });
      const [ok] = await Promise.all([apply, sleep(1600)]);
      if (!ok) {
        setBanner(null);
        return;
      }
      setBanner({ kind: "arrived", name: place.name });
      if (!hasAccess) void showPaywall();
      await sleep(2400);
      setBanner((current) =>
        current?.kind === "arrived" && current.name === place.name
          ? null
          : current
      );
    },
    [hasAccess, saveLocation, flash, waitForCameraSettled]
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
    <div
      className={cn(
        "fixed inset-0 flex flex-col bg-[#0a0a0c] text-[#f4f4f5] antialiased",
        SYSTEM_FONT
      )}
    >
      <div className="absolute inset-0">
        <RemoteMap
          place={mapPlace}
          onSelect={(place) => select(place, true)}
          active={isSelectedActive}
          showPin={selected != null && mode === "teleport"}
          recenterKey={recenterKey}
          landingKey={landingKey}
          onCameraMoving={handleCameraMoving}
        />
      </div>

      <div className="pointer-events-none relative z-[1000] flex flex-col gap-2 px-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
        {/* Buttons on either side so the wordmark sits dead centre for screen recordings. */}
        <div
          className={cn(
            "pointer-events-auto flex h-11 items-center rounded-[14px] px-1",
            floating
          )}
        >
          <button
            type="button"
            onClick={() => setShowSaved(true)}
            aria-label="Favoris"
            className={cn(
              "flex h-10 w-10 items-center justify-center text-[#f472b6]",
              PRESSABLE
            )}
          >
            <Bookmark className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </button>
          <Wordmark className="flex-1 text-center text-[21px]" />
          <Link
            href="/dashboard?tab=account"
            aria-label="Réglages"
            className="flex h-10 w-10 items-center justify-center text-[#c4c4ca]"
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={2.2} />
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

        {banner ? <TeleportBanner key={banner.kind} banner={banner} /> : null}
        {showHomeHint ? <AddToHomeScreenHint onDismiss={dismissHomeHint} /> : null}
      </div>

      <div className="relative z-[1000] mt-auto px-2.5 pb-[max(env(safe-area-inset-bottom),0.375rem)]">
        <div className="rounded-[20px] border border-[#25252b] bg-[#0c0c0e]/[0.94] px-3 pb-2.5 pt-1 shadow-[0_-6px_20px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Déplier" : "Replier"}
            className="flex w-full justify-center pb-1.5 pt-0.5"
          >
            <span className="h-1 w-9 rounded-full bg-[#303038]" />
          </button>

          {/* The pill slides under the tabs instead of jumping between them. */}
          <div className="relative flex rounded-xl border border-[#25252b] bg-[#070708] p-[3px]">
            <span
              aria-hidden
              className="absolute bottom-[3px] left-[3px] top-[3px] w-[calc(50%-3px)] rounded-[9px] bg-[#ec4899]/[0.13] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{
                transform: mode === "explore" ? "translateX(100%)" : "none",
              }}
            />
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
                  "relative flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[9px] text-sm font-medium transition-colors duration-300",
                  mode === value ? "text-[#f472b6]" : "text-[#c4c4ca]"
                )}
              >
                <Icon
                  className={cn(
                    "h-[15px] w-[15px]",
                    value === "teleport" && "fill-current"
                  )}
                />
                {label}
              </button>
            ))}
          </div>

          {/* Collapse by animating the row height (grid 1fr -> 0fr). */}
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
            )}
          >
          <div className="min-h-0 overflow-hidden">
          {mode === "teleport" ? (
            <div key="teleport" className="animate-[remote-fade_0.25s_ease-out] pt-2.5">
              {selected ? (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <Caption text={statusText} error={offline} />
                      <p
                        className={cn(
                          "truncate text-[11px] tabular-nums text-[#8b8b94]",
                          MONO_FONT
                        )}
                      >
                        {formatCoords(selected.lat, selected.lng)}
                      </p>
                    </div>
                    <p
                      key={selected.name}
                      className="animate-[remote-fade_0.25s_ease-out] truncate text-[17px] font-semibold leading-tight tracking-[-0.01em]"
                    >
                      {selected.name}
                    </p>
                  </div>
                  <SquareIconButton
                    label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    onClick={() => toggleFavorite(selected)}
                  >
                    <Bookmark
                      className={cn("h-[18px] w-[18px]", isFavorite && "fill-current")}
                      strokeWidth={2.4}
                    />
                  </SquareIconButton>
                  <SquareIconButton
                    label="Recentrer"
                    onClick={() => setRecenterKey((key) => key + 1)}
                  >
                    <Navigation2 className="h-[18px] w-[18px] fill-current" />
                  </SquareIconButton>
                </div>
              ) : (
                <div>
                  <Caption text={readyLabel} error={offline} />
                  <p className="text-[15px] font-medium text-[#c4c4ca]">
                    Touche la carte ou cherche un lieu
                  </p>
                </div>
              )}

              <div className="h-2.5" />

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
                    className={cn(
                      "flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-br from-[#ec4899] to-[#a855f7] text-base font-semibold text-white shadow-[0_6px_12px_rgba(236,72,153,0.4)] transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-45 disabled:shadow-none"
                    )}
                  >
                    {isBusy ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                    ) : (
                      <Crosshair className="h-[18px] w-[18px]" strokeWidth={2.4} />
                    )}
                    Définir cette position
                  </button>
                  {isActive ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void stop()}
                      className="w-full pt-2 text-[13px] font-medium text-[#8b8b94]"
                    >
                      Revenir à ma vraie position
                    </button>
                  ) : null}
                </>
              )}

              {shownStatus ? (
                <p
                  className={cn(
                    "pt-2 text-center text-[13px] font-semibold",
                    shownStatus.error ? "text-[#f87171]" : "text-[#f472b6]"
                  )}
                >
                  {shownStatus.text}
                </p>
              ) : null}
            </div>
          ) : (
            <div key="explore" className="animate-[remote-fade_0.25s_ease-out]">
              <div className="-mx-3 flex gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none]">
                {REMOTE_SPOT_CATEGORIES.map((category) => {
                  const on = spotCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSpotCategory(category.id)}
                      className={cn(
                        "shrink-0 rounded-full border px-3.5 py-[7px] text-[13px] font-semibold transition-colors duration-200",
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
              <div className="h-[min(240px,32dvh)] overflow-y-auto [scrollbar-width:none]">
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
                    className="flex w-full items-center gap-3 rounded-xl py-1.5 text-left transition-colors duration-150 active:bg-[#16161a]"
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

      {paywallPlace ? (
        <ActivateLocationDialog
          place={paywallPlace}
          onActivate={() => {
            setPlansPlace(paywallPlace);
            setPaywallPlace(null);
          }}
          onClose={() => setPaywallPlace(null)}
        />
      ) : null}

      {showSetup ? (
        <SetupDialog installTrack={installTrack} onClose={() => setShowSetup(false)} />
      ) : null}

      {plansPlace ? (
        <RemotePlansSheet
          initialPlanId={planId}
          stripePublishableKey={stripePublishableKey}
          destination={plansPlace.name}
          onClose={() => setPlansPlace(null)}
        />
      ) : null}

      {showcase ? (
        <TeleportShowcase
          destination={showcase.destination}
          step={showcase.step}
          closing={showcase.closing ?? false}
        />
      ) : null}
    </div>
  );
}
