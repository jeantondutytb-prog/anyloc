"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Crosshair,
  Globe,
  Lock,
  Navigation,
  Route,
  Search,
  Settings,
} from "lucide-react";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import { cn } from "@/lib/utils";

// Mirrors the iOS app's dark map screen (apps/ios/Anyloc/MapHomeView.swift):
// floating top bar + search, gradient pin, "Téléporter" bottom sheet and the
// "Application de la position…" overlay.

const OnboardingAppMap = dynamic(
  () => import("@/components/onboarding/onboarding-app-map"),
  { ssr: false, loading: () => <div className="h-full w-full bg-[#1b1b1f]" /> },
);

type Phase = "connect" | "lock" | "applying" | "sync" | "done";

const APPS = ["Snap", "Insta", "Tinder", "Life360"];

const CAPTIONS: Record<Phase, string> = {
  connect: "Connexion au GPS…",
  lock: "Position verrouillée",
  applying: "Position verrouillée",
  sync: "Synchro des apps…",
  done: "Position active",
};

const TYPING_START = 300;
const TYPING_SPEED = 70;

function useTimeline(destination: OnboardingDestination) {
  const [phase, setPhase] = useState<Phase>("connect");
  const [typed, setTyped] = useState(0);
  const [syncedApps, setSyncedApps] = useState(0);
  const [pressed, setPressed] = useState(false);

  // Remounted via `key` when the destination changes, so state starts fresh.
  useEffect(() => {
    const at = (ms: number, fn: () => void) => window.setTimeout(fn, ms);
    const chars = destination.city.length;
    const lockAt = TYPING_START + chars * TYPING_SPEED + 350;

    const timers = [
      ...Array.from({ length: chars }, (_, i) =>
        at(TYPING_START + (i + 1) * TYPING_SPEED, () => setTyped(i + 1)),
      ),
      at(lockAt, () => setPhase("lock")),
      at(lockAt + 700, () => setPressed(true)),
      at(lockAt + 850, () => {
        setPressed(false);
        setPhase("applying");
      }),
      at(lockAt + 2000, () => setPhase("sync")),
      ...APPS.map((_, i) =>
        at(lockAt + 2250 + i * 300, () => setSyncedApps(i + 1)),
      ),
      at(lockAt + 2250 + APPS.length * 300, () => setPhase("done")),
    ];

    return () => timers.forEach(clearTimeout);
  }, [destination.city]);

  return { phase, typed, syncedApps, pressed };
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

function ApplyingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-[600] flex flex-col items-center justify-center bg-black/75 px-8 text-center backdrop-blur-sm"
    >
      <Image
        src="/logo.png"
        alt=""
        width={56}
        height={56}
        unoptimized
        className="h-14 w-14 rounded-2xl drop-shadow-[0_0_16px_rgba(236,72,153,0.6)]"
      />
      <div className="mb-3.5 mt-2.5 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-pink-500"
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>
      <p className="text-[15px] font-semibold text-[#F4F4F5]">
        Application de la position…
      </p>
      <p className="mt-1.5 text-[11.5px] leading-snug text-[#8B8B94]">
        Mise à jour de la position sur ton iPhone. Reste connecté, ça ne prend
        qu&apos;un instant.
      </p>
    </motion.div>
  );
}

const floatingCard =
  "rounded-[18px] border border-[#25252B] bg-[#0A0A0C]/[0.93] backdrop-blur-md";

export function OnboardingAhaMoment({
  destination,
  onDestinationChange,
  onLockedClick,
  onSetPositionClick,
}: {
  destination: OnboardingDestination;
  onDestinationChange: (lat: number, lng: number) => void;
  /** Called when a visitor taps the app UI, which stays locked until signup. */
  onLockedClick?: () => void;
  /** "Définir cette position" is the one mock control that leads to signup. */
  onSetPositionClick?: () => void;
}) {
  const { phase, typed, syncedApps, pressed } = useTimeline(destination);
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
  const located = phase !== "connect";
  const isDone = phase === "done";
  const query = located ? "" : destination.city.slice(0, typed);

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <span className="absolute -top-3 left-1/2 z-[700] -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-white shadow-lg ring-2 ring-white">
        👀 Aperçu de l&apos;app
      </span>
      <div className="relative h-[510px] w-full overflow-hidden rounded-[32px] bg-[#0A0A0C] shadow-2xl shadow-pink-500/20 ring-1 ring-black/10 sm:h-[540px]">
        <div className="absolute inset-0 z-0">
          <OnboardingAppMap
            lat={destination.lat}
            lng={destination.lng}
            zoom={located ? 14 : 11}
            focusY={focusY}
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
              src="/logo.png"
              alt=""
              width={26}
              height={26}
              unoptimized
              className="h-[26px] w-[26px] rounded-lg"
            />
            <span className="text-[17px] font-semibold text-[#F4F4F5]">
              Anyloc
            </span>
            <span className="flex-1" />
            <Bookmark
              className="mx-2 h-[18px] w-[18px] text-[#F472B6]"
              strokeWidth={2.4}
            />
            <Settings className="mx-2 h-[18px] w-[18px] text-[#C4C4CA]" />
          </div>
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
          <p className="pr-1 text-right text-[9px] text-white/35">
            © Esri · © OpenStreetMap
          </p>
        </div>

        {/* Pin — drops in once the position is locked */}
        <AnimatePresence>
          {located && (
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

          <div className="flex gap-1">
            {[
              { label: "Téléporter", Icon: Navigation, on: true },
              { label: "Trajet", Icon: Route, on: false },
              { label: "Explorer", Icon: Globe, on: false },
            ].map(({ label, Icon, on }) => (
              <div
                key={label}
                className={cn(
                  "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[11px] text-[13px] font-medium",
                  on ? "bg-pink-500/[0.13] text-[#F472B6]" : "text-[#C4C4CA]",
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", on && "fill-current")} />
                {label}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={CAPTIONS[phase]}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.18 }}
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#F472B6]"
                >
                  {CAPTIONS[phase]}
                </motion.p>
              </AnimatePresence>
              {located ? (
                <>
                  <p className="truncate text-[17px] font-semibold text-[#F4F4F5]">
                    {destination.emoji} {destination.city}
                  </p>
                  <p className="truncate font-mono text-[12px] text-[#8B8B94]">
                    {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                  </p>
                </>
              ) : (
                <p className="mt-0.5 pb-[18px] text-[15px] font-medium text-[#C4C4CA]">
                  Touche la carte ou cherche un lieu
                </p>
              )}
            </div>
            {located && (
              <div className="flex gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-pink-500/[0.13] text-[#F472B6]">
                  <Bookmark className="h-[17px] w-[17px]" strokeWidth={2.4} />
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-pink-500/[0.13] text-[#F472B6]">
                  <Navigation className="h-[17px] w-[17px] fill-current" />
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {APPS.map((app, index) => {
              const synced = syncedApps > index;
              const syncing = phase === "sync" && syncedApps === index;

              return (
                <div
                  key={app}
                  className={cn(
                    "rounded-[10px] border py-1.5 text-center transition-colors duration-300",
                    synced
                      ? "border-pink-500/[0.42] bg-pink-500/[0.13] text-[#F472B6]"
                      : "border-[#25252B] bg-[#16161A] text-[#C4C4CA]",
                  )}
                >
                  <p className="text-[12px] font-medium leading-tight">{app}</p>
                  <p
                    className={cn(
                      "truncate px-1 text-[10px] leading-tight",
                      synced ? "opacity-75" : "text-[#55555D]",
                    )}
                  >
                    {synced ? destination.city : syncing ? "Synchro…" : "—"}
                  </p>
                </div>
              );
            })}
          </div>

          <motion.button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSetPositionClick?.();
            }}
            animate={{ scale: pressed ? 0.96 : 1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-pink-500 to-purple-500 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(236,72,153,0.35)] transition-opacity",
              !located && "opacity-45 shadow-none",
            )}
          >
            <Crosshair className="h-[17px] w-[17px]" strokeWidth={2.4} />
            Définir cette position
          </motion.button>
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
          {phase === "applying" && <ApplyingOverlay />}
        </AnimatePresence>
      </div>
    </div>
  );
}
