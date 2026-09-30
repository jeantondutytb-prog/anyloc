"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  BatteryFull,
  Bookmark,
  Earth,
  LocateFixed,
  MapPin,
  Navigation,
  Navigation2,
  Route,
  Search,
  Settings,
  Wifi,
} from "lucide-react";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import { cn } from "@/lib/utils";

const AppMapBackdrop = dynamic(() => import("@/components/onboarding/app-map-backdrop"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#1a1830]" />,
});

// Mirrors the "Téléporter" panel of the iOS app (apps/ios/Anyloc/MapHomeView.swift).
type Phase = "ready" | "press" | "applying" | "active";

function useAppTimeline() {
  const [phase, setPhase] = useState<Phase>("ready");

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase("press"), 1400),
      window.setTimeout(() => setPhase("applying"), 1750),
      window.setTimeout(() => setPhase("active"), 3600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return phase;
}

function StatusBar() {
  return (
    <div className="relative flex h-9 items-center justify-between px-6 pt-1 text-[11px] font-semibold text-white">
      <span>18:47</span>
      <span className="absolute left-1/2 top-2 h-[22px] w-[76px] -translate-x-1/2 rounded-full bg-black" />
      <span className="flex items-center gap-1">
        <Wifi className="h-3 w-3" strokeWidth={3} />
        <BatteryFull className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

function SquareIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ec4899]/[0.13] text-[#f472b6]">
      {children}
    </span>
  );
}

export function OnboardingAppPreview({
  destination,
}: {
  destination: OnboardingDestination;
}) {
  const phase = useAppTimeline();
  const isActive = phase === "active";
  const coords = `${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}`;

  return (
    <div className="isolate mx-auto -mb-[117px] w-[272px] origin-top scale-[0.8] rounded-[46px] sm:mb-0 sm:scale-100 bg-zinc-900 p-[7px] shadow-2xl shadow-pink-500/20 ring-1 ring-zinc-700">
      <div className="relative h-[572px] overflow-hidden rounded-[39px] bg-[#0a0a0c] font-sans">
        <div className="absolute inset-x-0 top-0 h-[68%] [&_.leaflet-tile-pane]:[filter:invert(1)_grayscale(1)_brightness(0.6)_contrast(1.25)]">
          <AppMapBackdrop lat={destination.lat} lng={destination.lng} />
          <div className="pointer-events-none absolute inset-0 z-[450] bg-[#5b3fa8]/70 mix-blend-color" />
        </div>

        <div className="pointer-events-none absolute left-1/2 top-[40%] z-[500] -translate-x-1/2 -translate-y-full">
          <motion.div
            key={phase === "active" ? "active" : "idle"}
            initial={isActive ? { scale: 0.6, y: -12 } : false}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 14 }}
            className="relative flex flex-col items-center"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ec4899] to-[#c026d3] shadow-lg shadow-pink-500/50 [border-bottom-right-radius:4px] rotate-45">
              <span className="h-3 w-3 -rotate-45 rounded-full bg-white" />
            </span>
            <span className="mt-1.5 h-2 w-8 rounded-full bg-pink-500/40 blur-[3px]" />
            {isActive && (
              <span className="absolute bottom-0 h-8 w-8 animate-ping rounded-full bg-pink-500/30" />
            )}
          </motion.div>
        </div>

        <div className="relative z-[600]">
          <div className="bg-[#0a0a0c]">
            <StatusBar />
          </div>

          <div className="space-y-2 px-2.5 pt-2">
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#25252b] bg-[#0a0a0c]/95 px-3.5 py-2.5">
              <MapPin className="h-4 w-4 text-[#f472b6]" />
              <span className="flex-1 text-[15px] font-semibold text-[#f4f4f5]">Anyloc</span>
              <Bookmark className="h-4 w-4 text-[#f472b6]" />
              <Settings className="h-4 w-4 text-[#c4c4ca]" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-[#25252b] bg-[#0a0a0c]/95 px-3.5 py-2.5">
              <Search className="h-3.5 w-3.5 text-[#c4c4ca]" />
              <span className="truncate text-[11.5px] text-[#8b8b94]">
                Rechercher une ville, une adresse, un lieu
              </span>
            </div>
          </div>
        </div>

        <p className="absolute bottom-[45%] left-3 z-[600] text-[8px] text-white/50">
          © OpenStreetMap
        </p>

        <div className="absolute inset-x-2 bottom-2 z-[600] rounded-[24px] border border-[#25252b] bg-[#0c0c0e]/[0.97] px-3 pb-3 pt-2 shadow-[0_-6px_20px_rgba(0,0,0,0.4)]">
          <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-[#303038]" />

          <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#25252b] bg-[#070708] p-1 text-[10.5px] font-medium">
            <span className="flex items-center justify-center gap-1 rounded-lg bg-[#ec4899]/[0.13] py-1.5 text-[#f472b6]">
              <Navigation className="h-3 w-3 fill-current" /> Téléporter
            </span>
            <span className="flex items-center justify-center gap-1 py-1.5 text-[#c4c4ca]">
              <Route className="h-3 w-3" /> Trajet
            </span>
            <span className="flex items-center justify-center gap-1 py-1.5 text-[#c4c4ca]">
              <Earth className="h-3 w-3" /> Explorer
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={isActive ? "active" : "ready"}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#f472b6]"
                >
                  {isActive ? "Position active" : "Prêt sur Wi-Fi"}
                </motion.p>
              </AnimatePresence>
              <p className="mt-0.5 truncate text-[17px] font-semibold text-[#f4f4f5]">
                {destination.city}
              </p>
              <p className="font-mono text-[10.5px] text-[#8b8b94]">{coords}</p>
            </div>
            <SquareIcon>
              <Bookmark className="h-4 w-4" />
            </SquareIcon>
            <SquareIcon>
              <Navigation2 className="h-4 w-4 fill-current" />
            </SquareIcon>
          </div>

          <div className="my-3 h-px bg-[#25252b]" />

          <motion.div
            animate={{ scale: phase === "press" ? 0.96 : 1 }}
            transition={{ duration: 0.15 }}
            className="relative flex items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-gradient-to-r from-[#ec4899] to-[#a855f7] py-3 text-[13px] font-semibold text-white"
          >
            <LocateFixed className="h-4 w-4" />
            Définir cette position
            {phase === "press" && (
              <motion.span
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 0.4 }}
                className="absolute h-10 w-10 rounded-full bg-white"
              />
            )}
          </motion.div>

          <div className="h-[34px] pt-2.5 text-center">
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1"
                >
                  <p className="text-[11px] font-semibold text-[#f472b6]">
                    Position définie : {destination.city}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p
            className={cn(
              "text-center text-[11px] font-medium text-[#8b8b94] transition-opacity",
              isActive ? "opacity-100" : "opacity-0"
            )}
          >
            Revenir à ma vraie position
          </p>
        </div>

        <AnimatePresence>
          {phase === "applying" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[700] flex items-center justify-center bg-black/50"
            >
              <motion.div
                initial={{ scale: 0.92 }}
                animate={{ scale: 1 }}
                className="mx-6 flex flex-col items-center rounded-[22px] border border-[#25252b] bg-[#0c0c0e] px-5 pb-5 pt-6 text-center shadow-2xl"
              >
                <Image
                  src="/logo.png"
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-xl shadow-[0_0_16px_rgba(236,72,153,0.6)]"
                />
                <div className="mb-3 mt-2.5 flex gap-1.5">
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      animate={{ opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.3 }}
                      className="h-1.5 w-1.5 rounded-full bg-[#ec4899]"
                    />
                  ))}
                </div>
                <p className="text-[13px] font-semibold text-[#f4f4f5]">
                  Application de la position…
                </p>
                <p className="mt-1 text-[10px] leading-snug text-[#8b8b94]">
                  Mise à jour de la position sur ton téléphone. Ça ne prend qu&apos;un instant.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
