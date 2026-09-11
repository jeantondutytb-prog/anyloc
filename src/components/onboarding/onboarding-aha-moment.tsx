"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Smartphone } from "lucide-react";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import { cn } from "@/lib/utils";

type Phase = "home" | "travel" | "arrived" | "apps";

const APP_UPDATES = [
  { name: "Snap Map", color: "bg-yellow-400", delay: 0 },
  { name: "Instagram", color: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600", delay: 0.15 },
  { name: "Tinder", color: "bg-rose-500", delay: 0.3 },
  { name: "Life360", color: "bg-emerald-500", delay: 0.45 },
];

function MiniMap({
  destination,
  phase,
}: {
  destination: OnboardingDestination;
  phase: Phase;
}) {
  const arrived = phase === "arrived" || phase === "apps";

  return (
    <div className="relative h-36 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-50">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-4 top-6 h-16 w-24 rounded-full bg-sky-200/80 blur-xl" />
        <div className="absolute bottom-4 right-6 h-20 w-28 rounded-full bg-emerald-200/80 blur-xl" />
      </div>

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 144">
        <motion.path
          d="M 48 96 Q 120 40 180 72 T 272 56"
          fill="none"
          stroke="#f472b6"
          strokeWidth="3"
          strokeDasharray="8 6"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: phase === "travel" || arrived ? 1 : 0,
            opacity: phase === "travel" || arrived ? 0.8 : 0,
          }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      </svg>

      <motion.div
        className="absolute left-10 top-20 flex flex-col items-center"
        animate={{ opacity: phase === "home" ? 1 : 0.35, scale: phase === "home" ? 1 : 0.9 }}
        transition={{ duration: 0.4 }}
      >
        <div className="rounded-full bg-zinc-500 p-1.5 shadow-md">
          <MapPin className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="mt-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-zinc-600 shadow-sm">
          Chez toi
        </span>
      </motion.div>

      <motion.div
        className="absolute"
        initial={{ left: "12%", top: "72%" }}
        animate={{
          left: phase === "home" ? "12%" : arrived ? "78%" : "48%",
          top: phase === "home" ? "72%" : arrived ? "34%" : "48%",
        }}
        transition={{ duration: phase === "travel" ? 1.4 : 0.3, ease: "easeInOut" }}
      >
        <motion.div
          animate={{
            scale: arrived ? [1, 1.25, 1] : 1,
          }}
          transition={{ duration: 0.5, delay: arrived ? 0.1 : 0 }}
          className="flex flex-col items-center"
        >
          <div className="rounded-full bg-pink-500 p-2 shadow-lg shadow-pink-500/40">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          {arrived && (
            <motion.span
              initial={{ opacity: 0, y: 6, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mt-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-pink-600 shadow-md"
            >
              {destination.emoji} {destination.city}
            </motion.span>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

function SnapStoryPreview({
  destination,
  phase,
}: {
  destination: OnboardingDestination;
  phase: Phase;
}) {
  const showDestination = phase === "arrived" || phase === "apps";

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-black">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500" />
          <div>
            <p className="text-[11px] font-semibold text-white">ton_snap</p>
            <p className="text-[9px] text-white/60">Story · maintenant</p>
          </div>
        </div>
        <span className="rounded bg-yellow-400 px-1.5 py-0.5 text-[9px] font-bold text-black">
          SNAP
        </span>
      </div>

      <div className="relative mx-3 mb-3 aspect-[9/14] overflow-hidden rounded-xl bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />

        <AnimatePresence mode="wait">
          {!showDestination ? (
            <motion.div
              key="before"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-4"
            >
              <p className="text-sm text-white/70">Ta loc actuelle</p>
              <p className="mt-2 text-2xl font-bold text-white">📍 Paris</p>
              <p className="mt-1 text-xs text-white/50">Visible sur Snap Map</p>
            </motion.div>
          ) : (
            <motion.div
              key="after"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="rounded-2xl bg-white/15 px-5 py-3 backdrop-blur-md"
              >
                <p className="text-center text-3xl font-bold text-white">
                  📍 {destination.city}
                </p>
                <p className="mt-1 text-center text-sm text-white/80">
                  {destination.area}
                </p>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-xs font-medium text-emerald-300"
              >
                ✓ Visible par tes potes
              </motion.p>
            </motion.div>
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
  const [phase, setPhase] = useState<Phase>("home");

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase("travel"), 1200),
      window.setTimeout(() => setPhase("arrived"), 2800),
      window.setTimeout(() => setPhase("apps"), 3800),
    ];

    return () => timers.forEach(clearTimeout);
  }, [destination.id]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-3">
          <span className="flex items-center justify-center gap-2 text-sm font-medium text-white">
            <Smartphone className="h-4 w-4" />
            {phase === "home" && "Ta loc actuelle…"}
            {phase === "travel" && "Téléportation en cours…"}
            {(phase === "arrived" || phase === "apps") && "Signal GPS actif"}
          </span>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <SnapStoryPreview destination={destination} phase={phase} />
          <div className="space-y-3">
            <MiniMap destination={destination} phase={phase} />

            <div className="grid grid-cols-2 gap-2">
              {APP_UPDATES.map((app) => (
                <motion.div
                  key={app.name}
                  initial={{ opacity: 0.4, y: 8 }}
                  animate={{
                    opacity: phase === "apps" ? 1 : phase === "arrived" ? 0.7 : 0.35,
                    y: phase === "apps" ? 0 : 4,
                  }}
                  transition={{ delay: phase === "apps" ? app.delay : 0 }}
                  className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", app.color)} />
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      {app.name}
                    </p>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-zinc-800">
                    {phase === "home" ? "Paris" : destination.city}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "arrived" || phase === "apps" ? 1 : 0 }}
          className="mx-4 mb-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 sm:mx-5"
        >
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="h-2 w-2 rounded-full bg-emerald-500"
          />
          Coordonnées GPS mises à jour en temps réel
        </motion.div>
      </div>
    </div>
  );
}
