"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MapPin, Smartphone } from "lucide-react";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import { cn } from "@/lib/utils";

type Phase = "connect" | "travel" | "lock" | "sync" | "done";

const APPS = [
  { label: "SNAP MAP", pinClass: "text-yellow-500" },
  { label: "INSTAGRAM", pinClass: "text-pink-500" },
  { label: "TINDER", pinClass: "text-rose-500" },
  { label: "LIFE360", pinClass: "text-emerald-500" },
];

const PHASE_CONFIG: Record<
  Phase,
  { label: string; progress: number; headerClass: string }
> = {
  connect: {
    label: "Connexion au signal GPS…",
    progress: 15,
    headerClass: "from-zinc-500 to-zinc-600",
  },
  travel: {
    label: "Téléportation en cours…",
    progress: 45,
    headerClass: "from-violet-500 to-pink-500",
  },
  lock: {
    label: "Position verrouillée",
    progress: 65,
    headerClass: "from-pink-500 to-rose-500",
  },
  sync: {
    label: "Synchronisation de tes apps…",
    progress: 85,
    headerClass: "from-pink-500 to-violet-500",
  },
  done: {
    label: "Signal GPS actif",
    progress: 100,
    headerClass: "from-emerald-500 to-teal-500",
  },
};

function usePhaseTimeline(destinationId: string) {
  const [phase, setPhase] = useState<Phase>("connect");
  const [syncedApps, setSyncedApps] = useState(0);

  useEffect(() => {
    setPhase("connect");
    setSyncedApps(0);

    const timers = [
      window.setTimeout(() => setPhase("travel"), 900),
      window.setTimeout(() => setPhase("lock"), 2400),
      window.setTimeout(() => setPhase("sync"), 3000),
      window.setTimeout(() => setSyncedApps(1), 3400),
      window.setTimeout(() => setSyncedApps(2), 3800),
      window.setTimeout(() => setSyncedApps(3), 4200),
      window.setTimeout(() => setSyncedApps(4), 4600),
      window.setTimeout(() => setPhase("done"), 5000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [destinationId]);

  return { phase, syncedApps };
}

function AnimatedMap({
  destination,
  phase,
}: {
  destination: OnboardingDestination;
  phase: Phase;
}) {
  const traveling = phase === "travel";
  const arrived = phase === "lock" || phase === "sync" || phase === "done";

  return (
    <div className="relative h-44 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-50">
      {phase === "connect" && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute h-28 w-28 rounded-full border-2 border-pink-300/60"
            animate={{ scale: [0.6, 1.4], opacity: [0.8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute h-20 w-20 rounded-full border-2 border-pink-400/80"
            animate={{ scale: [0.5, 1.2], opacity: [0.9, 0] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.3,
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-pink-500" />
            <p className="text-xs font-medium text-zinc-600">Recherche du signal…</p>
          </div>
        </motion.div>
      )}

      {(traveling || arrived) && (
        <>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 176">
            <motion.path
              d="M 56 130 Q 140 50 220 90 T 340 70"
              fill="none"
              stroke="#ec4899"
              strokeWidth="3"
              strokeDasharray="10 8"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: traveling || arrived ? 1 : 0,
                opacity: traveling || arrived ? 0.75 : 0,
              }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            />
          </svg>

          <motion.div
            className="absolute flex flex-col items-center"
            initial={{ left: "12%", top: "68%" }}
            animate={{
              left: arrived ? "78%" : traveling ? "52%" : "12%",
              top: arrived ? "32%" : traveling ? "48%" : "68%",
            }}
            transition={{
              duration: traveling ? 1.3 : 0.35,
              ease: "easeInOut",
            }}
          >
            <motion.div
              animate={
                arrived
                  ? { scale: [1, 1.35, 1], boxShadow: "0 0 0 0 rgba(236,72,153,0)" }
                  : traveling
                    ? { y: [0, -4, 0] }
                    : {}
              }
              transition={
                arrived
                  ? { duration: 0.55 }
                  : traveling
                    ? { duration: 0.8, repeat: Infinity }
                    : {}
              }
              className="rounded-full bg-pink-500 p-2.5 shadow-lg shadow-pink-500/40"
            >
              <MapPin className="h-4 w-4 text-white" />
            </motion.div>

            {arrived && (
              <motion.span
                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
                className="mt-1.5 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-pink-600 shadow-md"
              >
                {destination.emoji} {destination.city}
              </motion.span>
            )}
          </motion.div>

          {traveling && (
            <motion.p
              className="absolute bottom-3 left-0 right-0 text-center text-[11px] font-medium text-pink-600"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              En route vers {destination.city}…
            </motion.p>
          )}
        </>
      )}
    </div>
  );
}

function CoordinatesTicker({
  destination,
  phase,
}: {
  destination: OnboardingDestination;
  phase: Phase;
}) {
  const showCoords = phase !== "connect";

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium text-zinc-500">Coordonnées</span>
        <AnimatePresence mode="wait">
          {!showCoords ? (
            <motion.span
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-mono text-zinc-400"
            >
              --.----, --.----
            </motion.span>
          ) : (
            <motion.span
              key="coords"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono font-medium text-pink-600"
            >
              {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function OnboardingAhaMoment({
  destination,
}: {
  destination: OnboardingDestination;
}) {
  const { phase, syncedApps } = usePhaseTimeline(destination.id);
  const config = PHASE_CONFIG[phase];
  const isDone = phase === "done";
  const showDestination = phase === "lock" || phase === "sync" || isDone;

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl">
      <motion.div
        layout
        className={cn(
          "bg-gradient-to-r px-5 py-3 text-center text-sm font-medium text-white transition-colors duration-500",
          config.headerClass
        )}
      >
        <span className="inline-flex items-center gap-2">
          {isDone ? (
            <Check className="h-4 w-4" />
          ) : (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-4 w-4" />
            </motion.span>
          )}
          <AnimatePresence mode="wait">
            <motion.span
              key={config.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {config.label}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.div>

      <div className="h-1 bg-zinc-100">
        <motion.div
          className="h-full bg-gradient-to-r from-pink-500 to-violet-500"
          initial={{ width: "0%" }}
          animate={{ width: `${config.progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="p-5 sm:p-6">
        <AnimatedMap destination={destination} phase={phase} />
        <CoordinatesTicker destination={destination} phase={phase} />

        <motion.div
          initial={false}
          animate={{
            opacity: showDestination ? 1 : 0.4,
            y: showDestination ? 0 : 4,
          }}
          transition={{ duration: 0.35 }}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3"
        >
          <span className="text-3xl">{destination.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-zinc-900">
              {showDestination ? destination.city : "Localisation en cours…"}
            </p>
            <p className="text-sm text-zinc-500">
              {showDestination ? destination.area : "Patientez quelques secondes"}
            </p>
          </div>
          {showDestination && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100"
            >
              <Check className="h-4 w-4 text-emerald-600" />
            </motion.div>
          )}
        </motion.div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {APPS.map((app, index) => {
            const synced = syncedApps > index;
            const syncing = phase === "sync" && syncedApps === index;

            return (
              <motion.div
                key={app.label}
                animate={{
                  opacity: synced || isDone ? 1 : showDestination ? 0.55 : 0.35,
                  scale: synced ? 1 : 0.98,
                }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "rounded-xl border px-3 py-3 transition-colors",
                  synced || isDone
                    ? "border-pink-100 bg-pink-50/50"
                    : "border-zinc-100 bg-zinc-50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    {app.label}
                  </p>
                  {syncing && (
                    <Loader2 className="h-3 w-3 animate-spin text-pink-500" />
                  )}
                  {(synced || isDone) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500"
                    >
                      <Check className="h-2.5 w-2.5 text-white" />
                    </motion.div>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-zinc-800">
                  <MapPin className={cn("h-3.5 w-3.5", app.pinClass)} />
                  {synced || isDone ? destination.city : "…"}
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isDone ? 1 : 0 }}
          transition={{ duration: 0.35 }}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700"
        >
          <motion.span
            animate={isDone ? { scale: [1, 1.35, 1] } : {}}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="h-2 w-2 rounded-full bg-emerald-500"
          />
          Coordonnées GPS mises à jour en temps réel
        </motion.div>
      </div>
    </div>
  );
}
