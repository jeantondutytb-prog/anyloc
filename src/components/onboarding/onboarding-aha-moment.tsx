"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Check, CheckCircle2, Crosshair, Loader2, Lock, Search } from "lucide-react";
import { track } from "@/lib/analytics/track";
import { distanceKm } from "@/lib/geo-distance";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import { cn } from "@/lib/utils";
import type { VisitorLocation } from "@/lib/visitor-location";

// Mirrors the iOS app's dark map screen (apps/ios/Anyloc/MapHomeView.swift):
// floating top bar + search, gradient pin, bottom sheet and the branded
// teleport card of the app's filming mode (TeleportShowcaseView in
// HomeComponents.swift), the one seen in the marketing videos. With the
// visitor's position (city from their IP), it starts there; the map jumps to
// the destination behind the card, with no flight.

const OnboardingAppMap = dynamic(
  () => import("@/components/onboarding/onboarding-aha-map"),
  { ssr: false, loading: () => <div className="h-full w-full bg-[#1b1b1f]" /> },
);

type Phase = "connect" | "ready" | "showcase" | "lock" | "sync" | "done";

type ShowcaseStep = "connecting" | "sending" | "done";

const APPS = ["Snap", "Insta", "Tinder", "Life360"];

const CAPTIONS: Record<Phase, string> = {
  connect: "Connexion au GPS…",
  ready: "Prêt",
  showcase: "Téléportation…",
  lock: "Position verrouillée",
  sync: "Synchro des apps…",
  // Not "active": the visitor's real location hasn't moved yet.
  done: "Prête à activer",
};

const TYPING_START = 300;
/** With a flight, the visitor first sees their own city for a moment. */
const HOME_HOLD_MS = 1400;
const TYPING_SPEED = 70;
/** Once the card fully covers the map, the map jumps to the destination. */
const SHOWCASE_COVERED_MS = 700;
/** The card's steps, timed like the app's playShowcase (MapHomeView.swift). */
const SHOWCASE_SENDING_MS = 2200;
const SHOWCASE_DONE_MS = 4200;
const SHOWCASE_END_MS = 5800;

/**
 * The destination types itself into the search, then everything waits on
 * "Prêt" until the visitor taps "Définir cette position" (`start`): the
 * branded card (the map jumps to the destination behind it), lock,
 * apps synced one by one, then "done".
 */
function useTimeline(destination: OnboardingDestination, withTravel: boolean) {
  const [phase, setPhase] = useState<Phase>("connect");
  const [typed, setTyped] = useState(0);
  const [syncedApps, setSyncedApps] = useState(0);
  const [showcaseStep, setShowcaseStep] = useState<ShowcaseStep>("connecting");
  const [covered, setCovered] = useState(false);
  const timers = useRef<number[]>([]);

  const at = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // Remounted via `key` when the destination changes, so state starts fresh.
  useEffect(() => {
    const chars = destination.city.length;
    const typingStart = withTravel ? TYPING_START + HOME_HOLD_MS : TYPING_START;
    const ids = [
      ...Array.from({ length: chars }, (_, i) =>
        window.setTimeout(() => setTyped(i + 1), typingStart + (i + 1) * TYPING_SPEED),
      ),
      window.setTimeout(
        () => setPhase((current) => (current === "connect" ? "ready" : current)),
        typingStart + chars * TYPING_SPEED + 350,
      ),
    ];
    const pending = timers.current;
    return () => {
      ids.forEach(clearTimeout);
      pending.forEach(clearTimeout);
    };
  }, [destination.city, withTravel]);

  function start() {
    if (phase !== "connect" && phase !== "ready") return;
    setTyped(destination.city.length);
    setPhase("showcase");
    at(SHOWCASE_COVERED_MS, () => setCovered(true));
    at(SHOWCASE_SENDING_MS, () => setShowcaseStep("sending"));
    at(SHOWCASE_DONE_MS, () => setShowcaseStep("done"));
    const lockAt = SHOWCASE_END_MS;
    at(lockAt, () => setPhase("lock"));
    at(lockAt + 500, () => setPhase("sync"));
    APPS.forEach((_, i) => at(lockAt + 750 + i * 300, () => setSyncedApps(i + 1)));
    at(lockAt + 750 + APPS.length * 300, () => setPhase("done"));
  }

  return { phase, typed, syncedApps, showcaseStep, covered, start };
}

/** Measures where the visible map area sits between the top UI and the sheet. */
function useFocusY() {
  const topRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [focusY, setFocusY] = useState(180);

  useLayoutEffect(() => {
    const top = topRef.current;
    const sheet = sheetRef.current;
    if (!top || !sheet) {
      return;
    }

    const measure = () => {
      setFocusY((top.offsetTop + top.offsetHeight + sheet.offsetTop) / 2);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(top);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  return { topRef, sheetRef, focusY };
}

function GradientPin({ live }: { live: boolean }) {
  return (
    <div className="relative flex h-[40px] w-[56px] justify-center">
      <span className="absolute top-[24px] h-4 w-14 rounded-full bg-[radial-gradient(closest-side,rgba(236,72,153,0.55),transparent)]" />
      {live && (
        <motion.span
          className="absolute top-[20px] h-6 w-6 rounded-full border-2 border-pink-400"
          animate={{ scale: [0.6, 2.4], opacity: [0.8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className="relative flex h-8 w-8 -rotate-45 items-center justify-center rounded-full rounded-bl-none bg-gradient-to-br from-pink-500 to-purple-500 shadow-[0_6px_14px_rgba(236,72,153,0.55)]">
        <span className="h-3 w-3 rounded-full bg-white" />
      </span>
    </div>
  );
}

/** Staged entrance like the app: logo, then the wordmark, then the status. */
const SHOWCASE_STAGES = [0.25, 0.75, 1.2];

function TeleportShowcase({ step, city }: { step: ShowcaseStep; city: string }) {
  const text =
    step === "connecting"
      ? "Connexion à ton tel…"
      : step === "sending"
        ? `Téléportation vers ${city}…`
        : `Tu es à ${city}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="absolute inset-0 z-[600] flex flex-col items-center justify-center gap-5 bg-[#0A0A0C]/95 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.35),transparent_240px)] px-5"
    >
      <motion.div
        className="relative flex h-[165px] w-full items-center justify-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 12, delay: SHOWCASE_STAGES[0] }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute h-28 w-28 rounded-full border-2"
            style={{ borderColor: i === 1 ? "#c06cf0" : i === 2 ? "#a855f7" : "#ec4899" }}
            initial={{ scale: 0.8, opacity: 0.7 }}
            animate={{ scale: 2.1, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: i * 0.6 }}
          />
        ))}
        <motion.div
          animate={{ scale: [0.96, 1.06, 0.96] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/logo-mark.png"
            alt=""
            width={104}
            height={104}
            className="h-[104px] w-[104px] drop-shadow-[0_0_24px_rgba(236,72,153,0.6)]"
          />
        </motion.div>
      </motion.div>

      <motion.p
        className="whitespace-nowrap text-[44px] font-black leading-none tracking-tight [font-family:ui-rounded,'SF_Pro_Rounded',system-ui,sans-serif]"
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: SHOWCASE_STAGES[1] }}
      >
        <span className="text-white">anyloc</span>
        <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          .io
        </span>
      </motion.p>

      <motion.div
        className="flex h-10 max-w-full items-center gap-2 rounded-full border border-pink-500/[0.42] bg-[#16161A] px-4 text-[15px] font-semibold text-[#C4C4CA]"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: SHOWCASE_STAGES[2] }}
      >
        {step === "done" ? (
          <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-pink-500" />
        ) : (
          <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin text-pink-400" />
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={step}
            className="truncate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

const floatingCard =
  "rounded-[18px] border border-[#25252B] bg-[#0A0A0C]/[0.93] backdrop-blur-md";

export function OnboardingAhaMoment({
  destination,
  origin = null,
  onDestinationChange,
  onLockedClick,
  onTeleportStart,
  onDone,
}: {
  destination: OnboardingDestination;
  /** Where the visitor is (IP city): the pin starts there, then flies. */
  origin?: VisitorLocation | null;
  onDestinationChange: (lat: number, lng: number) => void;
  /** Called when a visitor taps the app UI, which stays locked until signup. */
  onLockedClick?: () => void;
  /** The visitor tapped "Définir cette position": the teleport starts. */
  onTeleportStart?: () => void;
  /** The teleport animation is over: the position is "active". */
  onDone?: () => void;
}) {
  // No flight when "there" is basically "here" (same city).
  const distance = origin ? distanceKm(origin, destination) : 0;
  const withTravel = Boolean(origin) && distance > 30;
  const { phase, typed, syncedApps, showcaseStep, covered, start } = useTimeline(destination, withTravel);

  useEffect(() => {
    if (phase === "done") onDone?.();
    // Only the phase change matters, not a new callback identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase === "showcase" && withTravel) {
      // Rounded: says how far, never where the visitor is.
      track("onboarding_travel_played", { distance_km: Math.round(distance / 100) * 100 });
    }
  }, [phase, distance, withTravel]);
  const [lockedToast, setLockedToast] = useState(0);

  useEffect(() => {
    if (!lockedToast) {
      return;
    }
    const timer = window.setTimeout(() => setLockedToast(0), 2200);
    return () => window.clearTimeout(timer);
  }, [lockedToast]);

  const showLocked = () => {
    setLockedToast((count) => count + 1);
    onLockedClick?.();
  };
  const { topRef, sheetRef, focusY } = useFocusY();
  const waiting = phase === "connect" || phase === "ready";
  // The map stays on the visitor's city until the card hides it.
  const atHome = withTravel && (waiting || (phase === "showcase" && !covered));
  // The pin sits on the destination (it is "there") from the flight on, or
  // right away when there is no flight.
  const located = !atHome && phase !== "connect";
  const isDone = phase === "done";
  const query = phase === "connect" ? destination.city.slice(0, typed) : "";
  const caption = atHome && phase === "connect" ? "Ta position actuelle" : CAPTIONS[phase];
  const mapPoint = atHome && origin ? origin : destination;

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Fits the screen below the title, so "Définir cette position" stays visible on a phone. */}
      <div className="relative h-[clamp(400px,calc(100dvh-200px),510px)] w-full overflow-hidden rounded-[32px] bg-[#0A0A0C] shadow-2xl shadow-pink-500/20 ring-1 ring-black/10 sm:h-[540px]">
        <div className="absolute inset-0 z-0">
          <OnboardingAppMap
            lat={mapPoint.lat}
            lng={mapPoint.lng}
            zoom={located || atHome ? 14 : 11}
            focusY={focusY}
            instant={phase === "showcase"}
            trail={withTravel && origin && located ? { from: origin, to: destination } : null}
            onSelect={onDestinationChange}
          />
        </div>

        {/* Top bar + search */}
        <div
          ref={topRef}
          onClick={showLocked}
          className="absolute inset-x-3 top-3 z-[500] space-y-2"
        >
          <div
            className={cn(
              floatingCard,
              "flex h-[46px] items-center gap-2 pl-3.5 pr-2",
            )}
          >
            <Image
              src="/logo-mark.png"
              alt=""
              width={26}
              height={26}
              unoptimized
              className="h-[26px] w-[26px] rounded-lg"
            />
            <span className="text-[17px] font-semibold text-[#F4F4F5]">
              Anyloc
            </span>
          </div>
          {/* The search only matters while the destination types itself in. */}
          {waiting && (
          <div
            className={cn(
              floatingCard,
              "flex h-[44px] items-center gap-2.5 px-4 text-[14px]",
            )}
          >
            <Search className="h-4 w-4 shrink-0 text-[#C4C4CA]" />
            {query ? (
              <span className="truncate text-[#F4F4F5]">
                {query}
                <motion.span
                  className="ml-px inline-block h-4 w-[1.5px] translate-y-[3px] bg-pink-400"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
              </span>
            ) : (
              <span className="truncate text-[#8B8B94]">
                Rechercher une ville, une adresse, un lieu
              </span>
            )}
          </div>
          )}
          <p className="pr-1 text-right text-[9px] text-white/35">
            © Esri · © OpenStreetMap
          </p>
        </div>

        {/* Pin — drops in once the position is locked */}
        <AnimatePresence>
          {/* Behind the card, it drops in as the card fades, like the app's landing shot. */}
          {(located || atHome) && phase !== "showcase" && (
            <motion.div
              className="pointer-events-none absolute left-1/2 z-[450] -ml-7"
              style={{ top: focusY - 38 }}
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
            >
              <GradientPin live={isDone} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom sheet */}
        <div
          ref={sheetRef}
          onClick={showLocked}
          className="absolute inset-x-2.5 bottom-2.5 z-[500] rounded-[24px] border border-[#25252B] bg-[#0C0C0E]/[0.97] px-3.5 pb-3.5 pt-2 shadow-[0_-6px_20px_rgba(0,0,0,0.4)]"
        >
          <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-[#303038]" />

          <div className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={caption}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.18 }}
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#F472B6]"
                >
                  {caption}
                </motion.p>
              </AnimatePresence>
              {located || phase === "ready" ? (
                <>
                  <p className="truncate text-[17px] font-semibold text-[#F4F4F5]">
                    {destination.emoji} {destination.city}
                  </p>
                  {(isDone || phase === "ready") && withTravel && origin ? (
                    <p className="truncate text-[12px] font-semibold text-[#F472B6]">
                      à {Math.round(distance).toLocaleString("fr-FR")} km de {origin.city}
                    </p>
                  ) : (
                    <p className="truncate font-mono text-[12px] text-[#8B8B94]">
                      {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                    </p>
                  )}
                </>
              ) : atHome && origin ? (
                <>
                  <p className="truncate text-[17px] font-semibold text-[#F4F4F5]">
                    📍 {origin.city}
                  </p>
                  <p className="truncate font-mono text-[12px] text-[#8B8B94]">
                    {origin.lat.toFixed(2)}, {origin.lng.toFixed(2)}
                  </p>
                </>
              ) : (
                <p className="mt-0.5 pb-[18px] text-[15px] font-medium text-[#C4C4CA]">
                  Touche la carte ou cherche un lieu
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {APPS.map((app, index) => {
              const synced = syncedApps > index;
              const syncing = phase === "sync" && syncedApps === index;

              return (
                <div
                  key={app}
                  className={cn(
                    "flex h-8 items-center justify-center gap-1 rounded-[10px] border text-[12px] font-semibold transition-colors duration-300",
                    synced
                      ? "border-pink-500/[0.42] bg-pink-500/[0.13] text-[#F472B6]"
                      : syncing
                        ? "border-[#25252B] bg-[#16161A] text-[#C4C4CA]"
                        : "border-[#25252B] bg-[#16161A] text-[#55555D]",
                  )}
                >
                  {synced && <Check className="h-3 w-3" strokeWidth={3} />}
                  {app}
                </div>
              );
            })}
          </div>

          {/* Once done, the onboarding moves on to signup by itself. */}
          {!isDone && (
          <div className="relative">
          {phase === "ready" && (
            // Small arrow over the button: the next move is the visitor's.
            <motion.span
              aria-hidden
              className="pointer-events-none absolute -top-5 left-1/2 z-10 -ml-3 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/40"
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowDown className="h-3.5 w-3.5" strokeWidth={3} />
            </motion.span>
          )}
          <motion.button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (waiting) {
                start();
                onTeleportStart?.();
              }
            }}
            // Pulses while it waits for the visitor's tap.
            animate={phase === "ready" ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={
              phase === "ready"
                ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.12 }
            }
            whileTap={{ scale: 0.96 }}
            className={cn(
              "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-pink-500 to-purple-500 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(236,72,153,0.35)] transition-opacity",
              !waiting && !isDone && "opacity-60 shadow-none",
            )}
          >
            <Crosshair className="h-[17px] w-[17px]" strokeWidth={2.4} />
            Définir cette position
          </motion.button>
          </div>
          )}
        </div>

        <AnimatePresence>
          {lockedToast > 0 && (
            <motion.div
              key={lockedToast}
              role="status"
              className="pointer-events-none absolute inset-x-6 z-[550] flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-center text-[13px] font-semibold text-zinc-900 shadow-2xl"
              style={{ top: focusY - 24 }}
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

        <AnimatePresence>
          {phase === "showcase" && (
            <TeleportShowcase step={showcaseStep} city={destination.city} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
